"""
prediction.views — Prediction views.

Uses MongoDB for dataset/prediction lookups instead of Django ORM.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from config.mongodb import get_collection
from upload.services import get_dataset_by_id
from . import services
from .services import serialize_prediction
from activity.services import log_activity


# ===============================================
# GET DATASET COLUMNS (for Prediction page)
# ===============================================

@api_view(['GET'])
def get_dataset_columns(request, pk):
    """Return all columns in the dataset with their types."""
    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = services.get_dataset_columns(dataset_doc)
    return Response(data)


# ===============================================
# PREDICTION
# ===============================================

@api_view(['POST'])
def run_prediction(request, pk):
    """Train a user-selected ML model — delegates to services."""
    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'success': False, 'message': 'Please upload a dataset first.'})

    target_column = request.data.get('target_column', '')
    feature_columns = request.data.get('feature_columns', [])
    cleaning_method = request.data.get('cleaning_method', 'mean')
    split_pct = int(request.data.get('split_pct', 80))
    model_type = request.data.get('model_type', '')
    model_params = request.data.get('model_params', {})

    result = services.run_prediction(
        dataset_doc, target_column, feature_columns,
        cleaning_method, split_pct, model_type, model_params,
        user=request.user,
    )

    if result.get('success'):
        log_activity(request.user, 'prediction', {
            'dataset': dataset_doc.get('original_filename', ''),
            'model_type': model_type,
            'target_column': target_column,
        }, request)

    return Response(result)


# ===============================================
# BATCH MODEL COMPARISON (KNN 1-100, DT 1-100)
# ===============================================

@api_view(['POST'])
def run_batch_comparison(request, pk):
    """
    Run KNN with n_neighbors=1..100 and Decision Tree with max_depth=1..100
    on the same dataset/target/features, returning metrics for every value.
    """
    import numpy as np
    import traceback
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from upload.utils import load_dataframe
    from .preprocessing import clean_data, encode_categorical_features, encode_target
    from .classification import build_knn, build_decision_tree
    from .metrics import compute_regression_metrics, compute_classification_metrics

    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'success': False, 'message': 'Please upload a dataset first.'})

    target_column = request.data.get('target_column', '')
    feature_columns = request.data.get('feature_columns', [])
    cleaning_method = request.data.get('cleaning_method', 'mean')
    split_pct = int(request.data.get('split_pct', 80))

    # --- Load & validate ---
    try:
        df = load_dataframe(dataset_doc)
    except Exception:
        return Response({'success': False, 'message': 'Could not load dataset.'})

    if df.empty:
        return Response({'success': False, 'message': 'Dataset is empty.'})

    all_columns = list(df.columns)
    if not target_column or target_column not in all_columns:
        return Response({'success': False, 'message': 'Invalid target column.'})
    if not feature_columns:
        return Response({'success': False, 'message': 'Select at least one feature column.'})
    for fc in feature_columns:
        if fc not in all_columns:
            return Response({'success': False, 'message': f'Feature "{fc}" not found.'})

    if split_pct < 50 or split_pct > 95:
        split_pct = 80

    # --- Prepare data ---
    work_cols = list(dict.fromkeys(feature_columns + [target_column]))
    work_df = df[work_cols].copy()
    work_df, feature_columns, error = clean_data(work_df, feature_columns, target_column, cleaning_method)
    if error:
        return Response({'success': False, 'message': error})
    if len(work_df) < 5:
        return Response({'success': False, 'message': 'Not enough data rows after cleaning.'})

    work_df, label_encoders = encode_categorical_features(work_df, feature_columns)
    work_df, is_classification, le_target = encode_target(work_df, target_column)

    # Heuristic: numeric with few unique values → classification
    if not is_classification:
        if work_df[target_column].nunique() <= 20:
            is_classification = True

    X = work_df[feature_columns].values
    y = work_df[target_column].values
    test_size = round((100 - split_pct) / 100, 2)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

    # Scaled copies for KNN
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # --- KNN loop (n_neighbors = 1..100) ---
    knn_results = []
    for k in range(1, 101):
        try:
            model, _, _ = build_knn({'n_neighbors': k}, is_classification)
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)

            metrics = {}
            try:
                metrics.update(compute_regression_metrics(y_test, y_pred))
            except Exception:
                pass
            try:
                y_t = np.round(y_test).astype(int)
                y_p = np.round(y_pred).astype(int)
                metrics.update(compute_classification_metrics(y_t, y_p))
            except Exception:
                pass

            knn_results.append({
                'param_value': k,
                'accuracy': metrics.get('accuracy'),
                'r2': metrics.get('r2'),
                'mae': metrics.get('mae'),
                'mse': metrics.get('mse'),
                'precision': metrics.get('precision'),
                'recall': metrics.get('recall'),
                'f1_score': metrics.get('f1_score'),
            })
        except Exception:
            knn_results.append({'param_value': k, 'error': True})

    # --- Decision Tree loop (max_depth = 1..100) ---
    dt_results = []
    for d in range(1, 101):
        try:
            model, _, _ = build_decision_tree({'max_depth': d}, is_classification)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

            metrics = {}
            try:
                metrics.update(compute_regression_metrics(y_test, y_pred))
            except Exception:
                pass
            try:
                y_t = np.round(y_test).astype(int)
                y_p = np.round(y_pred).astype(int)
                metrics.update(compute_classification_metrics(y_t, y_p))
            except Exception:
                pass

            dt_results.append({
                'param_value': d,
                'accuracy': metrics.get('accuracy'),
                'r2': metrics.get('r2'),
                'mae': metrics.get('mae'),
                'mse': metrics.get('mse'),
                'precision': metrics.get('precision'),
                'recall': metrics.get('recall'),
                'f1_score': metrics.get('f1_score'),
            })
        except Exception:
            dt_results.append({'param_value': d, 'error': True})

    return Response({
        'success': True,
        'is_classification': is_classification,
        'dataset_name': dataset_doc.get('original_filename', ''),
        'target_column': target_column,
        'feature_columns': feature_columns,
        'split_pct': split_pct,
        'training_records': len(X_train),
        'testing_records': len(X_test),
        'knn_results': knn_results,
        'dt_results': dt_results,
    })


# ===============================================
# PREDICTION HISTORY
# ===============================================

@api_view(['GET'])
def get_prediction_history(request, pk):
    """Return prediction history for a dataset."""
    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    predictions = get_collection('predictions')
    docs = predictions.find({
        'dataset_id': int(pk),
        'user_id': request.user.id,
    }).sort('created_at', -1)

    return Response([serialize_prediction(doc) for doc in docs])
