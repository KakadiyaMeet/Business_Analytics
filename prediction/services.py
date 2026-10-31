"""
prediction.services — ML prediction workflow orchestration.

Coordinates preprocessing, model building, training, and evaluation.
Stores prediction results in MongoDB instead of Django ORM.
Pandas and scikit-learn remain unchanged.
"""

import math
import time as _time
import traceback
import numpy as np

from django.utils import timezone
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from config.mongodb import get_collection, get_next_id
from upload.utils import load_dataframe
from .preprocessing import clean_data, encode_categorical_features, encode_target
from .regression import (
    build_linear_regression,
    build_multiple_linear_regression,
    build_polynomial_regression,
)
from .classification import (
    build_knn,
    build_svm,
    build_decision_tree,
    build_random_forest,
)
from .metrics import compute_regression_metrics, compute_classification_metrics


def _sanitize(obj):
    """Recursively replace NaN/Inf floats with None for JSON/BSON safety."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


# Valid model type identifiers
VALID_MODELS = [
    'linear_regression', 'multiple_linear_regression',
    'polynomial_regression', 'knn', 'svm',
    'decision_tree', 'random_forest',
]

# Models that only support regression targets
REGRESSION_ONLY_MODELS = ['linear_regression', 'multiple_linear_regression', 'polynomial_regression']

MODEL_NAMES = {
    'linear_regression': 'Linear Regression',
    'multiple_linear_regression': 'Multiple Linear Regression',
    'polynomial_regression': 'Polynomial Regression',
}


def serialize_prediction(doc):
    """Convert a MongoDB prediction document to a JSON-serializable dict."""
    if doc is None:
        return None
    return {
        'id': doc.get('id'),
        'dataset': doc.get('dataset_id'),
        'model_type': doc.get('model_type', ''),
        'model_display': _model_display_name(doc.get('model_type', '')),
        'target_column': doc.get('target_column', ''),
        'features_json': doc.get('features_json', []),
        'split_pct': doc.get('split_pct', 80),
        'r2_score': doc.get('r2_score', 0),
        'mae': doc.get('mae', 0),
        'mse': doc.get('mse', 0),
        'rmse': doc.get('rmse', 0),
        'results_json': doc.get('results_json', {}),
        'created_at': doc.get('created_at', '').isoformat() if hasattr(doc.get('created_at', ''), 'isoformat') else str(doc.get('created_at', '')),
    }


def _model_display_name(model_type):
    names = {
        'linear_regression': 'Linear Regression',
        'multiple_linear_regression': 'Multiple Linear Regression',
        'polynomial_regression': 'Polynomial Regression',
        'knn': 'K-Nearest Neighbors',
        'svm': 'Support Vector Machine',
        'decision_tree': 'Decision Tree',
        'random_forest': 'Random Forest',
        'lr': 'Linear Regression',
        'rf': 'Random Forest',
        'dt': 'Decision Tree',
    }
    return names.get(model_type, model_type)


def get_dataset_columns(dataset_doc):
    """
    Return all columns in the dataset with their types.

    Args:
        dataset_doc: MongoDB dataset document (dict).

    Returns:
        Dict with column info, numeric/categorical lists.
    """
    df = load_dataframe(dataset_doc)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    columns = []
    for col in df.columns:
        col_info = {
            'name': col,
            'dtype': str(df[col].dtype),
            'is_numeric': col in numeric_cols,
            'unique_count': int(df[col].nunique()),
            'missing_count': int(df[col].isnull().sum()),
        }
        columns.append(col_info)

    return {
        'dataset_name': dataset_doc.get('original_filename', ''),
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'columns': columns,
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols,
    }


def run_prediction(dataset_doc, target_column, feature_columns, cleaning_method,
                   split_pct, model_type, model_params, user=None):
    """
    Train a user-selected ML model with user-configured parameters.

    Args:
        dataset_doc: MongoDB dataset document (dict).
        target_column: Name of the target column.
        feature_columns: List of feature column names.
        cleaning_method: One of 'mean', 'median', 'mode', 'drop'.
        split_pct: Train/test split percentage (50-95).
        model_type: Model identifier string.
        model_params: Dict of model-specific hyperparameters.

    Returns:
        Dict with prediction results or error info.
    """
    # -- Step 1: Load dataset --
    try:
        df = load_dataframe(dataset_doc)
    except Exception:
        return {'success': False, 'message': 'Please upload a dataset first.'}

    if df.empty:
        return {'success': False, 'message': 'Please upload a dataset first.'}

    # -- Step 2: Validate columns --
    all_columns = list(df.columns)

    if not target_column or target_column not in all_columns:
        return {'success': False, 'message': 'Target Column does not exist in the dataset.'}

    if not feature_columns or not isinstance(feature_columns, list):
        return {'success': False, 'message': 'At least one Feature Column must be selected.'}

    for fc in feature_columns:
        if fc not in all_columns:
            return {'success': False, 'message': f'Feature Column "{fc}" does not exist in the dataset.'}

    if target_column in feature_columns:
        return {'success': False, 'message': 'Target Column cannot be included in Feature Columns.'}

    # -- Validate split --
    if split_pct < 50 or split_pct > 95:
        split_pct = 80

    # -- Validate model type --
    if model_type not in VALID_MODELS:
        return {'success': False, 'message': 'Please select a valid machine learning model.'}

    # -- Prepare working dataframe --
    work_cols = list(dict.fromkeys(feature_columns + [target_column]))
    work_df = df[work_cols].copy()

    # -- Step 3: Apply data cleaning --
    work_df, feature_columns, error = clean_data(work_df, feature_columns, target_column, cleaning_method)
    if error:
        return {'success': False, 'message': error}

    if len(work_df) < 5:
        return {'success': False, 'message': 'Not enough data rows after cleaning. At least 5 rows are required.'}

    # -- Encode categorical features --
    work_df, label_encoders = encode_categorical_features(work_df, feature_columns)

    # -- Step 4: Determine target type --
    work_df, is_classification, le_target = encode_target(work_df, target_column)

    # -- Heuristic: numeric target with few unique values + classification-capable model --
    if not is_classification and model_type not in REGRESSION_ONLY_MODELS:
        n_unique = work_df[target_column].nunique()
        if n_unique <= 20:
            is_classification = True

    # -- Step 5: Validate model vs target type --
    if is_classification and model_type in REGRESSION_ONLY_MODELS:
        return {
            'success': False,
            'message': f'Target column must be numeric for {MODEL_NAMES[model_type]}. '
                       f'The target column "{target_column}" is categorical.',
        }

    # -- Prepare X and y --
    X = work_df[feature_columns].values
    y = work_df[target_column].values

    # -- Train/Test Split --
    test_size = round((100 - split_pct) / 100, 2)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )

    # -- Scale features for SVM and KNN --
    scaler = None
    if model_type in ['svm', 'knn']:
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)

    # -- Build model --
    model = None
    poly_transformer = None
    model_display_name = ''
    used_params = {}

    try:
        if model_type == 'linear_regression':
            model, model_display_name, used_params = build_linear_regression()
        elif model_type == 'multiple_linear_regression':
            model, model_display_name, used_params = build_multiple_linear_regression()
        elif model_type == 'polynomial_regression':
            model, model_display_name, used_params, poly_transformer = build_polynomial_regression(model_params)
            X_train = poly_transformer.fit_transform(X_train)
            X_test = poly_transformer.transform(X_test)
        elif model_type == 'knn':
            model, model_display_name, used_params = build_knn(model_params, is_classification)
        elif model_type == 'svm':
            model, model_display_name, used_params = build_svm(model_params, is_classification)
        elif model_type == 'decision_tree':
            model, model_display_name, used_params = build_decision_tree(model_params, is_classification)
        elif model_type == 'random_forest':
            model, model_display_name, used_params = build_random_forest(model_params, is_classification)
    except Exception as e:
        print(f"[Prediction] Model build error: {traceback.format_exc()}")
        return {'success': False, 'message': 'Model training failed.', 'details': str(e)}

    if model is None:
        return {'success': False, 'message': 'Please select a valid machine learning model.'}

    # -- Train the model --
    train_start = _time.time()
    try:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
    except Exception as e:
        print(f"[Prediction] Training error: {traceback.format_exc()}")
        return {'success': False, 'message': 'Model training failed.', 'details': str(e)}
    train_time = round(_time.time() - train_start, 4)

    # -- Compute metrics --
    metrics = {}
    try:
        metrics.update(compute_regression_metrics(y_test, y_pred))
    except Exception:
        print(f"[Prediction] Regression metrics error: {traceback.format_exc()}")
    try:
        # Round predictions to discrete labels for classification metrics
        y_test_cls = np.round(y_test).astype(int)
        y_pred_cls = np.round(y_pred).astype(int)
        metrics.update(compute_classification_metrics(y_test_cls, y_pred_cls))
    except Exception:
        print(f"[Prediction] Classification metrics error: {traceback.format_exc()}")

    # -- Scatter points: Actual vs Predicted --
    scatter_pts = []
    n_pts = min(1000, len(y_test))
    indices = np.random.choice(len(y_test), n_pts, replace=False)
    for i in sorted(indices):
        scatter_pts.append({
            'actual': round(float(y_test[i]), 4),
            'pred': round(float(y_pred[i]), 4),
        })

    # -- Prediction Error (residuals) --
    error_pts = []
    for i in sorted(indices):
        error_pts.append({
            'pred': round(float(y_pred[i]), 4),
            'residual': round(float(y_test[i] - y_pred[i]), 4),
        })

    # -- Feature importance --
    feature_importance = []
    supports_feature_importance = False
    try:
        if hasattr(model, 'feature_importances_'):
            supports_feature_importance = True
            importances = model.feature_importances_
            for fname, imp in sorted(zip(feature_columns, importances), key=lambda x: -x[1]):
                feature_importance.append({'name': fname, 'score': round(float(imp), 4)})
        elif hasattr(model, 'coef_'):
            coefs = np.abs(model.coef_) if model.coef_.ndim == 1 else np.abs(model.coef_).mean(axis=0)
            if len(coefs) == len(feature_columns):
                supports_feature_importance = True
                total = coefs.sum() if coefs.sum() > 0 else 1
                for fname, imp in sorted(zip(feature_columns, coefs / total), key=lambda x: -x[1]):
                    feature_importance.append({'name': fname, 'score': round(float(imp), 4)})
    except Exception:
        supports_feature_importance = False

    # -- Save to MongoDB --
    r2_val = metrics.get('r2', 0)
    mae_val = metrics.get('mae', 0)
    mse_val = metrics.get('mse', 0)

    prediction_id = None
    try:
        prediction_id = get_next_id('predictions')
        pred_doc = _sanitize({
            'id': prediction_id,
            'user_id': user.id if user else None,
            'dataset_id': dataset_doc.get('id'),
            'model_type': model_type,
            'target_column': target_column,
            'features_json': feature_columns,
            'split_pct': split_pct,
            'missing_value_strategy': cleaning_method,
            'r2_score': r2_val,
            'mae': mae_val,
            'mse': mse_val,
            'rmse': round(float(np.sqrt(mse_val)), 4) if mse_val else 0,
            'accuracy': metrics.get('accuracy'),
            'results_json': {
                'scatter_pts': scatter_pts,
                'error_pts': error_pts,
                'feature_importance': feature_importance,
                'metrics': metrics,
                'is_classification': is_classification,
                'model_params': used_params,
            },
            'created_at': timezone.now(),
        })
        get_collection('predictions').insert_one(pred_doc)
    except Exception:
        print(f"[Prediction] DB save error: {traceback.format_exc()}")
        prediction_id = None

    return {
        'success': True,
        'dataset_name': dataset_doc.get('original_filename', ''),
        'target_column': target_column,
        'feature_columns': feature_columns,
        'model_name': model_display_name,
        'model_type': model_type,
        'cleaning_method': cleaning_method,
        'split_pct': split_pct,
        'model_params': used_params,
        'training_records': len(X_train),
        'testing_records': len(X_test),
        'training_time': train_time,
        'is_classification': is_classification,
        'metrics': metrics,
        'scatter_pts': scatter_pts,
        'error_pts': error_pts,
        'feature_importance': feature_importance,
        'supports_feature_importance': supports_feature_importance,
        'prediction_id': prediction_id,
    }
