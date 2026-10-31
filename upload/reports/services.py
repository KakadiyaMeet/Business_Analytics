"""
reports.services — Report generation orchestration.

Generates PDF reports using xhtml2pdf. Stores report metadata in MongoDB.
"""

import os
import io
from datetime import datetime

from django.conf import settings
from django.utils import timezone

from config.mongodb import get_collection, get_next_id
from upload.utils import load_dataframe
from .templates import (
    build_summary_report_html,
    build_eda_report_html,
    build_prediction_report_html,
)


def serialize_report(doc):
    """Convert a MongoDB report document to a JSON-serializable dict."""
    if doc is None:
        return None
    file_path = doc.get('file_path', '')
    return {
        'id': doc.get('id'),
        'report_type': doc.get('report_type', ''),
        'file': f'/media/{file_path}' if file_path else '',
        'file_size': doc.get('file_size', 0),
        'download_count': doc.get('download_count', 0),
        'created_at': doc.get('created_at', '').isoformat() if hasattr(doc.get('created_at', ''), 'isoformat') else str(doc.get('created_at', '')),
    }


class DatasetProxy:
    """
    Lightweight proxy that exposes MongoDB dataset document fields as attributes.
    Needed by report templates that access dataset.original_filename, etc.
    """
    def __init__(self, doc):
        self._doc = doc
        for key, value in doc.items():
            if key != '_id':
                setattr(self, key, value)


def generate_pdf_report(dataset_doc, report_type, user=None):
    """
    Generate a downloadable PDF report.

    Args:
        dataset_doc: MongoDB dataset document (dict).
        report_type: One of 'eda', 'prediction', 'summary'.

    Returns:
        Tuple of (response_data_dict, error_message, http_status).
        error_message is None on success.
    """
    try:
        df = load_dataframe(dataset_doc)
    except Exception as e:
        return None, f'Failed to load dataset: {str(e)}', 500

    # Wrap the dict so templates can use attribute access (dataset.original_filename)
    dataset_proxy = DatasetProxy(dataset_doc)

    # Build HTML content based on report type
    try:
        if report_type == 'summary':
            html_content = build_summary_report_html(dataset_proxy, df)
        elif report_type == 'eda':
            html_content = build_eda_report_html(dataset_proxy, df)
        elif report_type == 'prediction':
            html_content = build_prediction_report_html(dataset_proxy, df)
        else:
            return None, 'Invalid report type.', 400
    except Exception as e:
        import traceback as tb
        print(f"[Report] HTML generation error: {tb.format_exc()}")
        return None, f'Report generation failed: {str(e)}', 500

    # Generate PDF
    try:
        from xhtml2pdf import pisa
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
        os.makedirs(reports_dir, exist_ok=True)

        original_name = dataset_doc.get('original_filename', 'data').replace('.csv', '')
        filename = f"{report_type}_{original_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(reports_dir, filename)

        with open(filepath, 'wb') as f:
            pisa_status = pisa.CreatePDF(io.BytesIO(html_content.encode('utf-8')), dest=f)

        if pisa_status.err:
            return None, 'Failed to generate PDF. The PDF engine encountered an error.', 500

        # Read file for size
        with open(filepath, 'rb') as f:
            content = f.read()
            file_size = len(content)

        # Save report metadata to MongoDB
        report_id = get_next_id('reports')
        rel_path = os.path.join('reports', filename)
        now = timezone.now()

        report_doc = {
            'id': report_id,
            'user_id': user.id if user else None,
            'dataset_id': dataset_doc.get('id'),
            'report_type': report_type,
            'file_path': rel_path,
            'file_size': file_size,
            'download_count': 0,
            'created_at': now,
        }
        get_collection('reports').insert_one(report_doc)

        data = {
            'report': serialize_report(report_doc),
            'download_url': f'/media/{rel_path}',
        }
        return data, None, 201

    except ImportError:
        return None, 'PDF generation library (xhtml2pdf) is not installed.', 500
    except Exception as e:
        import traceback as tb
        print(f"[Report] PDF generation error: {tb.format_exc()}")
        return None, f'PDF generation failed: {str(e)}', 500
