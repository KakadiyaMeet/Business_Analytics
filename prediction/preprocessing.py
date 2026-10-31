"""
prediction.preprocessing — Data cleaning and feature encoding for ML pipelines.

Moved from ml/preprocessing.py.
"""

import numpy as np
from sklearn.preprocessing import LabelEncoder


def clean_data(work_df, feature_columns, target_column, cleaning_method):
    """
    Apply data cleaning to a working DataFrame.

    Args:
        work_df: DataFrame containing only feature + target columns.
        feature_columns: List of feature column names.
        target_column: Name of the target column.
        cleaning_method: One of 'mean', 'median', 'mode', 'drop'.

    Returns:
        Tuple of (cleaned_df, updated_feature_columns, error_message).
        error_message is None on success, a string on failure.
    """
    numeric_cols_in_work = work_df.select_dtypes(include=[np.number]).columns.tolist()

    if cleaning_method == 'mean':
        for col in numeric_cols_in_work:
            if work_df[col].isnull().any():
                work_df[col] = work_df[col].fillna(work_df[col].mean())
        work_df = work_df.dropna()
    elif cleaning_method == 'median':
        for col in numeric_cols_in_work:
            if work_df[col].isnull().any():
                work_df[col] = work_df[col].fillna(work_df[col].median())
        work_df = work_df.dropna()
    elif cleaning_method == 'mode':
        for col in work_df.columns:
            if work_df[col].isnull().any():
                mode_val = work_df[col].mode()
                if len(mode_val) > 0:
                    work_df[col] = work_df[col].fillna(mode_val[0])
        work_df = work_df.dropna()
    elif cleaning_method == 'drop':
        cols_with_missing = [c for c in work_df.columns if work_df[c].isnull().any()]
        if cols_with_missing:
            feature_columns = [c for c in feature_columns if c not in cols_with_missing]
            if target_column in cols_with_missing:
                return work_df, feature_columns, 'Target Column contains missing values and cannot be dropped.'
            work_df = work_df.drop(columns=cols_with_missing)
            if not feature_columns:
                return work_df, feature_columns, 'All Feature Columns were dropped due to missing values. Please select different columns.'

    return work_df, feature_columns, None


def encode_categorical_features(work_df, feature_columns):
    """
    Encode categorical feature columns using LabelEncoder.

    Args:
        work_df: DataFrame with feature and target columns.
        feature_columns: List of feature column names.

    Returns:
        Tuple of (encoded_df, label_encoders_dict).
    """
    label_encoders = {}
    for col in feature_columns:
        if work_df[col].dtype == 'object' or str(work_df[col].dtype) == 'category':
            le = LabelEncoder()
            work_df[col] = le.fit_transform(work_df[col].astype(str))
            label_encoders[col] = le
    return work_df, label_encoders


def encode_target(work_df, target_column):
    """
    Determine if target is classification, and encode if categorical.

    Args:
        work_df: DataFrame containing the target column.
        target_column: Name of the target column.

    Returns:
        Tuple of (encoded_df, is_classification, label_encoder_or_None).
    """
    target_series = work_df[target_column]
    is_classification = False

    if target_series.dtype == 'object' or str(target_series.dtype) == 'category':
        # Categorical target -> classification
        is_classification = True
        le_target = LabelEncoder()
        work_df[target_column] = le_target.fit_transform(target_series.astype(str))
        return work_df, is_classification, le_target
    else:
        # Numeric target -> regression (do NOT use unique count to override)
        return work_df, is_classification, None
