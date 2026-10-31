"""
prediction.regression — Regression model builders.

Moved from ml/regression.py.
"""

from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures


def build_linear_regression():
    """Build a Linear Regression model."""
    return LinearRegression(), 'Linear Regression', {}


def build_multiple_linear_regression():
    """Build a Multiple Linear Regression model (same as Linear Regression with multiple features)."""
    return LinearRegression(), 'Multiple Linear Regression', {}


def build_polynomial_regression(model_params):
    """
    Build a Polynomial Regression model.

    Args:
        model_params: Dict with optional 'degree' key.

    Returns:
        Tuple of (model, display_name, used_params, poly_transformer).
    """
    degree = int(model_params.get('degree', 2))
    if degree < 1:
        degree = 2
    poly_transformer = PolynomialFeatures(degree=degree)
    model = LinearRegression()
    used_params = {'degree': degree}
    return model, 'Polynomial Regression', used_params, poly_transformer
