"""
prediction.classification — Classification and dual-purpose model builders.

Moved from ml/classification.py.
Includes KNN, SVM, Decision Tree, and Random Forest — each supporting
both classification and regression based on the target column type.
"""

from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVC, SVR
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor


def build_knn(model_params, is_classification):
    """
    Build a K-Nearest Neighbors model.

    Args:
        model_params: Dict with optional 'n_neighbors' key.
        is_classification: If True, build classifier; else regressor.

    Returns:
        Tuple of (model, display_name, used_params).
    """
    n_neighbors = int(model_params.get('n_neighbors', 5))
    if n_neighbors < 1:
        n_neighbors = 5
    used_params = {'n_neighbors': n_neighbors}

    if is_classification:
        model = KNeighborsClassifier(n_neighbors=n_neighbors)
    else:
        model = KNeighborsRegressor(n_neighbors=n_neighbors)

    return model, 'K-Nearest Neighbors (KNN)', used_params


def build_svm(model_params, is_classification):
    """
    Build a Support Vector Machine model.

    Args:
        model_params: Dict with optional 'c_value' and 'kernel' keys.
        is_classification: If True, build SVC; else SVR.

    Returns:
        Tuple of (model, display_name, used_params).
    """
    c_value = float(model_params.get('c_value', 1.0))
    kernel = str(model_params.get('kernel', 'rbf')).lower()
    if kernel not in ['linear', 'rbf', 'poly', 'sigmoid']:
        kernel = 'rbf'
    used_params = {'C': c_value, 'kernel': kernel}

    if is_classification:
        model = SVC(C=c_value, kernel=kernel, random_state=42)
    else:
        model = SVR(C=c_value, kernel=kernel)

    return model, 'Support Vector Machine (SVM)', used_params


def build_decision_tree(model_params, is_classification):
    """
    Build a Decision Tree model.

    Args:
        model_params: Dict with optional 'max_depth' and 'min_samples_split' keys.
        is_classification: If True, build classifier (entropy); else regressor (squared_error).

    Returns:
        Tuple of (model, display_name, used_params).
    """
    max_depth = model_params.get('max_depth', None)
    if max_depth is not None and max_depth != '':
        max_depth = int(max_depth)
        if max_depth < 1:
            max_depth = None
    else:
        max_depth = None

    min_samples_split = int(model_params.get('min_samples_split', 2))
    if min_samples_split < 2:
        min_samples_split = 2

    used_params = {'max_depth': max_depth, 'min_samples_split': min_samples_split}

    if is_classification:
        used_params['criterion'] = 'entropy'
        model = DecisionTreeClassifier(
            criterion='entropy', max_depth=max_depth,
            min_samples_split=min_samples_split, random_state=42
        )
        display_name = 'Decision Tree (Entropy)'
    else:
        used_params['criterion'] = 'squared_error'
        model = DecisionTreeRegressor(
            criterion='squared_error', max_depth=max_depth,
            min_samples_split=min_samples_split, random_state=42
        )
        display_name = 'Decision Tree'

    return model, display_name, used_params


def build_random_forest(model_params, is_classification):
    """
    Build a Random Forest model.

    Args:
        model_params: Dict with optional 'n_estimators', 'max_depth', 'min_samples_split' keys.
        is_classification: If True, build classifier (entropy); else regressor (squared_error).

    Returns:
        Tuple of (model, display_name, used_params).
    """
    n_estimators = int(model_params.get('n_estimators', 100))
    if n_estimators < 1:
        n_estimators = 100

    max_depth = model_params.get('max_depth', None)
    if max_depth is not None and max_depth != '':
        max_depth = int(max_depth)
        if max_depth < 1:
            max_depth = None
    else:
        max_depth = None

    min_samples_split = int(model_params.get('min_samples_split', 2))
    if min_samples_split < 2:
        min_samples_split = 2

    used_params = {
        'n_estimators': n_estimators,
        'max_depth': max_depth,
        'min_samples_split': min_samples_split,
    }

    if is_classification:
        used_params['criterion'] = 'entropy'
        model = RandomForestClassifier(
            criterion='entropy', n_estimators=n_estimators,
            max_depth=max_depth, min_samples_split=min_samples_split,
            random_state=42, n_jobs=-1
        )
    else:
        used_params['criterion'] = 'squared_error'
        model = RandomForestRegressor(
            criterion='squared_error', n_estimators=n_estimators,
            max_depth=max_depth, min_samples_split=min_samples_split,
            random_state=42, n_jobs=-1
        )

    return model, 'Random Forest', used_params
