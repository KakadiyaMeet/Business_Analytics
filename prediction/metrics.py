"""
prediction.metrics — Model evaluation metric computation.

Moved from ml/metrics.py.
"""

import numpy as np
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix,
)


def compute_regression_metrics(y_test, y_pred):
    """
    Compute regression metrics: R², MAE, MSE.

    Args:
        y_test: Actual target values.
        y_pred: Predicted target values.

    Returns:
        Dict with 'r2', 'mae', 'mse' keys.
    """
    return {
        'r2': round(float(r2_score(y_test, y_pred)), 4),
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 2),
        'mse': round(float(mean_squared_error(y_test, y_pred)), 2),
    }


def compute_classification_metrics(y_test, y_pred):
    """
    Compute classification metrics: accuracy, precision, recall, F1, confusion matrix.

    Args:
        y_test: Actual target values.
        y_pred: Predicted target values.

    Returns:
        Dict with classification metric keys.
    """
    metrics = {}
    metrics['accuracy'] = round(float(accuracy_score(y_test, y_pred)), 4)
    avg = 'weighted' if len(np.unique(y_test)) > 2 else 'binary'
    metrics['precision'] = round(float(precision_score(y_test, y_pred, average=avg, zero_division=0)), 4)
    metrics['recall'] = round(float(recall_score(y_test, y_pred, average=avg, zero_division=0)), 4)
    metrics['f1_score'] = round(float(f1_score(y_test, y_pred, average=avg, zero_division=0)), 4)
    cm = confusion_matrix(y_test, y_pred)
    metrics['confusion_matrix'] = cm.tolist()
    return metrics
