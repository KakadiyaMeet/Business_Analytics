"""
upload.utils — Shared utility functions for dataset operations.
"""

import os
import pandas as pd
from django.conf import settings


def load_dataframe(dataset):
    """
    Read the stored CSV file for a dataset into a DataFrame.

    Args:
        dataset: Either a MongoDB document (dict) with 'file_path' key,
                 or any object with a file_path attribute.

    Raises:
        FileNotFoundError: If the CSV file does not exist on disk.
    """
    if isinstance(dataset, dict):
        file_path = dataset.get('file_path', '')
    else:
        file_path = getattr(dataset, 'file_path', '')

    # Handle absolute paths stored in old MongoDB records —
    # don't re-join with MEDIA_ROOT if the path is already absolute.
    if os.path.isabs(file_path):
        path = file_path
    else:
        path = os.path.join(settings.MEDIA_ROOT, file_path)

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset CSV file not found: {path}. "
            f"The file may have been deleted or moved. Please re-upload the dataset."
        )

    return pd.read_csv(path)
