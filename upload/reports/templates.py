"""
reports.templates — HTML template builders for PDF reports.

Extracted from services/report_service.py HTML building functions.
"""

from datetime import datetime

import numpy as np
import pandas as pd

from config.mongodb import get_collection
from .pdf_generator import (
    generate_correlation_heatmap,
    generate_histogram,
    generate_boxplot,
    generate_actual_vs_predicted,
    generate_prediction_error,
    generate_feature_importance,
    generate_confusion_matrix_chart,
)


# ═══════════════════════════════════════════════
# Report HTML styles and footer
# ═══════════════════════════════════════════════

def report_styles():
    """Common CSS styles for all PDF reports."""
    return """
    <style>
        @page {
            size: A4;
            margin: 20mm 18mm 25mm 18mm;
        }
        body {
            font-family: Helvetica, Arial, sans-serif;
            color: #1a1a2e;
            font-size: 11px;
            line-height: 1.5;
        }
        h1 {
            color: #6366f1;
            font-size: 24px;
            margin-bottom: 2px;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 8px;
        }
        h2 {
            color: #4f46e5;
            font-size: 16px;
            margin-top: 22px;
            margin-bottom: 8px;
            border-bottom: 2px solid #e0e7ff;
            padding-bottom: 5px;
        }
        h3 {
            color: #6366f1;
            font-size: 13px;
            margin-top: 14px;
            margin-bottom: 6px;
        }
        .subtitle {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 4px;
        }
        .meta {
            color: #94a3b8;
            font-size: 10px;
            margin-bottom: 18px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 14px 0;
            font-size: 10px;
        }
        th {
            background: #4f46e5;
            color: white;
            padding: 7px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
        }
        td {
            padding: 5px 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .row-even td {
            background: #f8fafc;
        }
        .kpi-table td:first-child {
            font-weight: 600;
            color: #475569;
            width: 45%;
        }
        .kpi-table td:last-child {
            color: #1e293b;
            font-weight: 700;
        }
        .section-note {
            color: #94a3b8;
            font-size: 10px;
            font-style: italic;
            margin: 8px 0;
        }
        .chart-container {
            text-align: center;
            margin: 12px 0;
            page-break-inside: avoid;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
        }
        .no-data {
            color: #94a3b8;
            font-size: 11px;
            font-style: italic;
            padding: 10px 0;
        }
        .status-success {
            color: #166534;
            background: #dcfce7;
            padding: 8px 14px;
            font-weight: 600;
            font-size: 11px;
            display: inline-block;
            margin: 8px 0;
        }
        .status-fail {
            color: #991b1b;
            background: #fef2f2;
            padding: 8px 14px;
            font-weight: 600;
            font-size: 11px;
            display: inline-block;
            margin: 8px 0;
        }
        .footer {
            margin-top: 30px;
            border-top: 2px solid #e2e8f0;
            padding-top: 10px;
            color: #94a3b8;
            font-size: 9px;
            text-align: center;
        }
        .footer-line { margin: 2px 0; }
    </style>
    """


def report_footer():
    """Common footer for all reports."""
    now = datetime.now()
    return f"""
    <div class="footer">
        <div class="footer-line">Generated on {now.strftime('%B %d, %Y')} at {now.strftime('%I:%M:%S %p')}</div>
        <div class="footer-line">Nova Analytics Platform</div>
    </div>
    """


# ═══════════════════════════════════════════════
# Report HTML builders
# ═══════════════════════════════════════════════

def build_summary_report_html(dataset, df):
    """Build Dataset Summary Report HTML matching the Dashboard page."""
    now = datetime.now()
    upload_dt = dataset.uploaded_at

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # Header
    html = f"""
    <h1>Nova Analytics - Dataset Summary Report</h1>
    <p class="subtitle">Dataset: {dataset.original_filename}</p>
    <p class="meta">Upload Date: {upload_dt.strftime('%B %d, %Y')} | Upload Time: {upload_dt.strftime('%I:%M:%S %p')}</p>

    <h2>Dataset Summary</h2>
    <table class="kpi-table">
        <tr><td>Total Rows</td><td>{dataset.total_rows:,}</td></tr>
        <tr><td>Total Columns</td><td>{dataset.total_columns}</td></tr>
        <tr><td>Numeric Columns</td><td>{dataset.numeric_columns_count}</td></tr>
        <tr><td>Categorical Columns</td><td>{dataset.categorical_columns_count}</td></tr>
        <tr><td>Missing Values</td><td>{dataset.missing_values_count:,}</td></tr>
        <tr><td>Duplicate Rows</td><td>{dataset.duplicate_rows_count:,}</td></tr>
        <tr><td>Dataset Size</td><td>{dataset.file_size / 1024:.1f} KB ({dataset.memory_usage:.2f} MB in memory)</td></tr>
    </table>

    <h2>Column Overview</h2>
    <table>
        <tr><th>Column Name</th><th>Data Type</th><th>Missing Values</th><th>Unique Values</th></tr>
    """
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        unique_count = int(df[col].nunique())
        html += f"<tr><td>{col}</td><td>{df[col].dtype}</td><td>{missing_count}</td><td>{unique_count}</td></tr>"
    html += "</table>"

    # Dataset Preview - first 10 rows
    html += "<h2>Dataset Preview</h2>"
    preview_df = df.head(10)
    if len(preview_df) > 0:
        html += "<table><tr>"
        for col in preview_df.columns:
            html += f"<th>{col}</th>"
        html += "</tr>"
        for _, row in preview_df.iterrows():
            html += "<tr>"
            for col in preview_df.columns:
                val = row[col]
                display_val = '' if pd.isna(val) else str(val)
                if len(display_val) > 50:
                    display_val = display_val[:47] + '...'
                html += f"<td>{display_val}</td>"
            html += "</tr>"
        html += "</table>"
        html += f'<p class="section-note">Showing first {len(preview_df)} of {len(df):,} rows</p>'
    else:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    html += report_footer()
    return f'<!DOCTYPE html><html><head><meta charset="UTF-8"/>{report_styles()}</head><body>{html}</body></html>'


def build_eda_report_html(dataset, df):
    """Build EDA Report HTML matching the EDA page."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    html = f"""
    <h1>Nova Analytics - EDA Report</h1>
    <p class="subtitle">Dataset: {dataset.original_filename}</p>
    <p class="meta">{len(df):,} rows x {len(df.columns)} columns</p>

    <h2>Dataset Information</h2>
    <h3>Shape</h3>
    <table class="kpi-table">
        <tr><td>Rows</td><td>{len(df):,}</td></tr>
        <tr><td>Columns</td><td>{len(df.columns)}</td></tr>
    </table>

    <h3>Data Types</h3>
    <table>
        <tr><th>Column</th><th>Data Type</th><th>Non-Null</th><th>Null</th><th>Unique</th></tr>
    """
    for col in df.columns:
        non_null = int(df[col].notna().sum())
        null_count = int(df[col].isnull().sum())
        unique_count = int(df[col].nunique())
        html += f"<tr><td>{col}</td><td>{df[col].dtype}</td><td>{non_null:,}</td><td>{null_count}</td><td>{unique_count}</td></tr>"
    html += "</table>"

    # Descriptive Statistics
    if numeric_cols:
        html += """
        <h2>Descriptive Statistics</h2>
        <table>
            <tr><th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>25%</th><th>50%</th><th>75%</th><th>Max</th></tr>
        """
        desc = df[numeric_cols].describe().round(2)
        for col in numeric_cols:
            mean_val = f"{df[col].mean():.2f}" if pd.notna(df[col].mean()) else '-'
            median_val = f"{df[col].median():.2f}" if pd.notna(df[col].median()) else '-'
            std_val = f"{df[col].std():.2f}" if pd.notna(df[col].std()) else '-'
            min_val = f"{df[col].min():.2f}" if pd.notna(df[col].min()) else '-'
            max_val = f"{df[col].max():.2f}" if pd.notna(df[col].max()) else '-'
            q25 = desc.loc['25%', col] if '25%' in desc.index else '-'
            q50 = desc.loc['50%', col] if '50%' in desc.index else '-'
            q75 = desc.loc['75%', col] if '75%' in desc.index else '-'
            html += f"<tr><td>{col}</td><td>{mean_val}</td><td>{median_val}</td><td>{std_val}</td><td>{min_val}</td><td>{q25}</td><td>{q50}</td><td>{q75}</td><td>{max_val}</td></tr>"
        html += "</table>"
    else:
        html += '<h2>Descriptive Statistics</h2><p class="no-data">No suitable data available in your file.</p>'

    # Missing Value Analysis
    html += "<h2>Missing Value Analysis</h2>"
    total_missing = int(df.isnull().sum().sum())
    html += f"<p>Total Missing Values: <strong>{total_missing:,}</strong></p>"
    html += "<table><tr><th>Column</th><th>Missing Count</th><th>Percentage</th></tr>"
    any_missing = False
    for col in df.columns:
        nc = int(df[col].isnull().sum())
        pct = round(nc / len(df) * 100, 1) if len(df) > 0 else 0
        html += f"<tr><td>{col}</td><td>{nc}</td><td>{pct}%</td></tr>"
        if nc > 0:
            any_missing = True
    html += "</table>"
    if not any_missing:
        html += '<p class="section-note">No missing values detected in this dataset.</p>'
    else:
        html += f'<p class="section-note">Cleaning Summary: {total_missing:,} total missing values across {sum(1 for c in df.columns if df[c].isnull().any())} column(s).</p>'

    # Duplicate Analysis
    dup_count = int(df.duplicated().sum())
    dup_pct = round(dup_count / len(df) * 100, 1) if len(df) > 0 else 0
    html += f"""
    <h2>Duplicate Analysis</h2>
    <table class="kpi-table">
        <tr><td>Duplicate Rows</td><td>{dup_count:,} ({dup_pct}%)</td></tr>
        <tr><td>Total Rows</td><td>{len(df):,}</td></tr>
    </table>
    """

    # Correlation Analysis
    html += "<h2>Correlation Analysis</h2>"
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr().round(2)
        html += "<h3>Correlation Matrix</h3><table><tr><th></th>"
        for col in numeric_cols:
            col_short = col[:12] + '..' if len(col) > 14 else col
            html += f"<th>{col_short}</th>"
        html += "</tr>"
        for i, row_col in enumerate(numeric_cols):
            row_short = row_col[:12] + '..' if len(row_col) > 14 else row_col
            html += f"<tr><td><strong>{row_short}</strong></td>"
            for j, col in enumerate(numeric_cols):
                val = corr_matrix.iloc[i, j]
                html += f"<td>{val:.2f}</td>"
            html += "</tr>"
        html += "</table>"

        heatmap_b64 = generate_correlation_heatmap(df, numeric_cols)
        if heatmap_b64:
            html += f'<div class="chart-container"><img src="data:image/png;base64,{heatmap_b64}" /></div>'
    else:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    # Outlier Analysis
    html += "<h2>Outlier Analysis</h2>"
    if numeric_cols:
        html += "<table><tr><th>Column</th><th>Outliers</th><th>%</th><th>Q1</th><th>Q3</th><th>IQR</th><th>Lower Bound</th><th>Upper Bound</th></tr>"
        any_outliers = False
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 4:
                continue
            Q1 = float(series.quantile(0.25))
            Q3 = float(series.quantile(0.75))
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outlier_count = int(((series < lower) | (series > upper)).sum())
            outlier_pct = round(outlier_count / len(series) * 100, 1)
            any_outliers = True
            html += f"<tr><td>{col}</td><td>{outlier_count}</td><td>{outlier_pct}%</td><td>{Q1:.2f}</td><td>{Q3:.2f}</td><td>{IQR:.2f}</td><td>{lower:.2f}</td><td>{upper:.2f}</td></tr>"
        html += "</table>"
        if not any_outliers:
            html += '<p class="no-data">No suitable data available in your file.</p>'
    else:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    # Distribution Analysis - Histograms and Box Plots
    html += "<h2>Distribution Analysis</h2>"
    if numeric_cols:
        for col in numeric_cols[:8]:  # Limit to 8 columns to avoid overly large PDFs
            hist_b64 = generate_histogram(df[col], col)
            if hist_b64:
                html += f'<div class="chart-container"><img src="data:image/png;base64,{hist_b64}" /></div>'

            box_b64 = generate_boxplot(df[col], col)
            if box_b64:
                html += f'<div class="chart-container"><img src="data:image/png;base64,{box_b64}" /></div>'
    else:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    html += report_footer()
    return f'<!DOCTYPE html><html><head><meta charset="UTF-8"/>{report_styles()}</head><body>{html}</body></html>'


def build_prediction_report_html(dataset, df):
    """Build Prediction Report HTML matching the Prediction page."""
    now = datetime.now()

    # Fetch latest prediction from MongoDB instead of Django ORM
    dataset_id = dataset.id if hasattr(dataset, 'id') else dataset.get('id') if isinstance(dataset, dict) else None
    latest_pred = None
    if dataset_id is not None:
        latest_pred = get_collection('predictions').find_one(
            {'dataset_id': dataset_id},
            sort=[('created_at', -1)]
        )

    html = f"""
    <h1>Nova Analytics - Prediction Report</h1>
    <p class="subtitle">Dataset: {dataset.original_filename}</p>
    <p class="meta">Prediction Date: {now.strftime('%B %d, %Y')} | Prediction Time: {now.strftime('%I:%M:%S %p')}</p>
    """

    if not latest_pred:
        html += '<p class="no-data">No prediction runs found for this dataset. Run a prediction first.</p>'
        html += report_footer()
        return f"<html><head>{report_styles()}</head><body>{html}</body></html>"

    results = latest_pred.get('results_json') or {}
    metrics = results.get('metrics', {})
    is_classification = results.get('is_classification', False)
    model_params = results.get('model_params', {})
    scatter_pts = results.get('scatter_pts', [])
    error_pts = results.get('error_pts', [])
    feature_importance = results.get('feature_importance', [])

    # Model display name mapping
    model_names = {
        'linear_regression': 'Linear Regression',
        'multiple_linear_regression': 'Multiple Linear Regression',
        'polynomial_regression': 'Polynomial Regression',
        'knn': 'K-Nearest Neighbors (KNN)',
        'svm': 'Support Vector Machine (SVM)',
        'decision_tree': 'Decision Tree',
        'random_forest': 'Random Forest',
    }
    model_type = latest_pred.get('model_type', '')
    model_display = model_names.get(model_type, model_type)

    # Training Configuration
    features = latest_pred.get('features_json') or []
    split_pct = latest_pred.get('split_pct', 80)
    target_column = latest_pred.get('target_column', '')

    html += f"""
    <h2>Training Configuration</h2>
    <table class="kpi-table">
        <tr><td>Selected ML Model</td><td>{model_display}</td></tr>
        <tr><td>Target Column</td><td>{target_column}</td></tr>
        <tr><td>Feature Columns</td><td>{', '.join(features) if features else '-'}</td></tr>
        <tr><td>Train/Test Split</td><td>{split_pct}% / {100 - split_pct}%</td></tr>
    """
    if model_params:
        params_str = ', '.join([f"{k}: {v}" for k, v in model_params.items()])
        html += f"<tr><td>Model Parameters</td><td>{params_str}</td></tr>"
    html += "</table>"

    # Training Summary
    total_usable = dataset.total_rows
    train_count = int(total_usable * split_pct / 100)
    test_count = total_usable - train_count

    created_at = latest_pred.get('created_at')
    if created_at and hasattr(created_at, 'strftime'):
        created_str = created_at.strftime('%B %d, %Y at %I:%M %p')
    else:
        created_str = str(created_at) if created_at else '-'

    html += f"""
    <h2>Training Summary</h2>
    <table class="kpi-table">
        <tr><td>Training Records</td><td>{train_count:,}</td></tr>
        <tr><td>Testing Records</td><td>{test_count:,}</td></tr>
        <tr><td>Prediction Date</td><td>{created_str}</td></tr>
    </table>
    """

    # Evaluation Metrics
    html += "<h2>Evaluation Metrics</h2>"
    if is_classification:
        html += '<h3>Classification Metrics</h3><table class="kpi-table">'
        html += f"<tr><td>Accuracy</td><td>{metrics.get('accuracy', '-')}</td></tr>"
        html += f"<tr><td>Precision</td><td>{metrics.get('precision', '-')}</td></tr>"
        html += f"<tr><td>Recall</td><td>{metrics.get('recall', '-')}</td></tr>"
        html += f"<tr><td>F1 Score</td><td>{metrics.get('f1_score', '-')}</td></tr>"
        html += "</table>"
    else:
        html += '<h3>Regression Metrics</h3><table class="kpi-table">'
        html += f"<tr><td>MAE (Mean Absolute Error)</td><td>{metrics.get('mae', latest_pred.get('mae', '-'))}</td></tr>"
        html += f"<tr><td>MSE (Mean Squared Error)</td><td>{metrics.get('mse', latest_pred.get('mse', '-'))}</td></tr>"
        html += f"<tr><td>R2 Score</td><td>{metrics.get('r2', latest_pred.get('r2_score', '-'))}</td></tr>"
        html += "</table>"

    # Prediction Visualizations
    html += "<h2>Prediction Visualizations</h2>"
    charts_generated = False

    if scatter_pts:
        avp_b64 = generate_actual_vs_predicted(scatter_pts)
        if avp_b64:
            html += f'<div class="chart-container"><img src="data:image/png;base64,{avp_b64}" /></div>'
            charts_generated = True

    if error_pts and not is_classification:
        err_b64 = generate_prediction_error(error_pts)
        if err_b64:
            html += f'<div class="chart-container"><img src="data:image/png;base64,{err_b64}" /></div>'
            charts_generated = True

    if feature_importance:
        fi_b64 = generate_feature_importance(feature_importance)
        if fi_b64:
            html += f'<div class="chart-container"><img src="data:image/png;base64,{fi_b64}" /></div>'
            charts_generated = True

    cm_data = metrics.get('confusion_matrix')
    if cm_data and is_classification:
        cm_b64 = generate_confusion_matrix_chart(cm_data)
        if cm_b64:
            html += f'<div class="chart-container"><img src="data:image/png;base64,{cm_b64}" /></div>'
            charts_generated = True

    if not charts_generated:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    # Prediction Sample Table
    html += "<h2>Prediction Sample</h2>"
    if scatter_pts:
        sample_pts = scatter_pts[:20]
        html += "<table><tr><th>#</th><th>Actual Value</th><th>Predicted Value</th></tr>"
        for i, pt in enumerate(sample_pts, 1):
            html += f"<tr><td>{i}</td><td>{pt['actual']}</td><td>{pt['pred']}</td></tr>"
        html += "</table>"
        html += f'<p class="section-note">Showing {len(sample_pts)} of {len(scatter_pts)} prediction samples</p>'
    else:
        html += '<p class="no-data">No suitable data available in your file.</p>'

    # Model Status
    html += "<h2>Model Status</h2>"
    html += '<div class="status-success">Training Completed Successfully</div>'

    html += report_footer()
    return f'<!DOCTYPE html><html><head><meta charset="UTF-8"/>{report_styles()}</head><body>{html}</body></html>'
