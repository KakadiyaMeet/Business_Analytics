"""
reports.pdf_generator — Chart generation helpers for PDF reports.

Extracted from services/report_service.py chart generation functions.
"""

import io
import base64

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def chart_to_base64(fig):
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#ffffff', edgecolor='none')
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return b64


def generate_correlation_heatmap(df, numeric_cols):
    """Generate correlation heatmap as base64 PNG."""
    if len(numeric_cols) < 2:
        return None

    corr = df[numeric_cols].corr()
    n = len(numeric_cols)
    fig_size = max(6, n * 0.8)
    fig, ax = plt.subplots(figsize=(fig_size, fig_size * 0.85))
    cmap = plt.cm.RdYlBu_r
    corr_values = corr.values
    im = ax.imshow(corr_values, cmap=cmap, aspect='equal',
                   vmin=-1, vmax=1)
    cbar = fig.colorbar(im, ax=ax, shrink=0.8)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(corr.columns, rotation=45, ha='right')
    ax.set_yticklabels(corr.index)
    font_size = max(7, 12 - n // 3)
    for i in range(n):
        for j in range(n):
            val = corr_values[i, j]
            color = 'white' if abs(val) > 0.6 else 'black'
            ax.text(j, i, f'{val:.2f}', ha='center', va='center',
                    fontsize=font_size, color=color)
    ax.set_title('Correlation Heatmap', fontsize=14, fontweight='bold', pad=15)
    ax.tick_params(axis='both', labelsize=max(7, 11 - n // 4))
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_histogram(series, col_name):
    """Generate histogram for a numeric column as base64 PNG."""
    series = series.dropna()
    if len(series) == 0:
        return None

    fig, ax = plt.subplots(figsize=(6, 3.5))
    n_bins = min(20, max(5, len(series) // 10))
    ax.hist(series, bins=n_bins, color='#6366f1', alpha=0.75, edgecolor='#4f46e5', linewidth=0.5)
    ax.set_title(f'Distribution of {col_name}', fontsize=12, fontweight='bold')
    ax.set_xlabel(col_name, fontsize=10)
    ax.set_ylabel('Frequency', fontsize=10)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_boxplot(series, col_name):
    """Generate box plot for a numeric column as base64 PNG."""
    series = series.dropna()
    if len(series) < 4:
        return None

    fig, ax = plt.subplots(figsize=(5, 3))
    bp = ax.boxplot(series, vert=True, patch_artist=True,
                    boxprops=dict(facecolor='#e0e7ff', edgecolor='#6366f1', linewidth=1.5),
                    medianprops=dict(color='#4f46e5', linewidth=2),
                    whiskerprops=dict(color='#6366f1', linewidth=1.2),
                    capprops=dict(color='#6366f1', linewidth=1.2),
                    flierprops=dict(marker='o', markerfacecolor='#f43f5e', markersize=4, alpha=0.6))
    ax.set_title(f'Box Plot - {col_name}', fontsize=12, fontweight='bold')
    ax.set_ylabel(col_name, fontsize=10)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_actual_vs_predicted(scatter_pts):
    """Generate actual vs predicted scatter plot as base64 PNG."""
    if not scatter_pts or len(scatter_pts) == 0:
        return None

    actuals = [p['actual'] for p in scatter_pts]
    preds = [p['pred'] for p in scatter_pts]

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.scatter(actuals, preds, alpha=0.6, c='#6366f1', edgecolors='#4f46e5', s=30)
    min_val = min(min(actuals), min(preds))
    max_val = max(max(actuals), max(preds))
    ax.plot([min_val, max_val], [min_val, max_val], 'r--', alpha=0.6, linewidth=1.5, label='Perfect Prediction')
    ax.set_xlabel('Actual Values', fontsize=11)
    ax.set_ylabel('Predicted Values', fontsize=11)
    ax.set_title('Actual vs Predicted', fontsize=13, fontweight='bold')
    ax.legend(fontsize=9)
    ax.grid(alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_prediction_error(error_pts):
    """Generate prediction error (residual) plot as base64 PNG."""
    if not error_pts or len(error_pts) == 0:
        return None

    preds = [p['pred'] for p in error_pts]
    residuals = [p['residual'] for p in error_pts]

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(preds, residuals, alpha=0.6, c='#10b981', edgecolors='#059669', s=30)
    ax.axhline(y=0, color='#ef4444', linestyle='--', alpha=0.6, linewidth=1.5)
    ax.set_xlabel('Predicted Values', fontsize=11)
    ax.set_ylabel('Residuals (Actual - Predicted)', fontsize=11)
    ax.set_title('Prediction Error Plot', fontsize=13, fontweight='bold')
    ax.grid(alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_feature_importance(feature_data):
    """Generate feature importance bar chart as base64 PNG."""
    if not feature_data or len(feature_data) == 0:
        return None

    names = [f['name'] for f in feature_data]
    scores = [f['score'] for f in feature_data]

    fig, ax = plt.subplots(figsize=(6, max(3, len(names) * 0.45)))
    bars = ax.barh(range(len(names)), scores, color='#6366f1', alpha=0.75, edgecolor='#4f46e5', height=0.6)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=10)
    ax.set_xlabel('Importance Score', fontsize=11)
    ax.set_title('Feature Importance', fontsize=13, fontweight='bold')
    ax.invert_yaxis()
    ax.grid(axis='x', alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    return chart_to_base64(fig)


def generate_confusion_matrix_chart(cm_data):
    """Generate confusion matrix heatmap as base64 PNG."""
    if not cm_data or len(cm_data) == 0:
        return None

    cm_array = np.array(cm_data)
    n = cm_array.shape[0]
    fig, ax = plt.subplots(figsize=(max(4, n * 1.2), max(3.5, n)))
    im = ax.imshow(cm_array, cmap='Blues', aspect='equal')
    cbar = fig.colorbar(im, ax=ax, shrink=0.8)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    font_size = max(9, 14 - n)
    max_val = cm_array.max()
    for i in range(n):
        for j in range(n):
            val = cm_array[i, j]
            color = 'white' if val > max_val / 2 else 'black'
            ax.text(j, i, f'{val:d}', ha='center', va='center',
                    fontsize=font_size, color=color)
    ax.set_xlabel('Predicted', fontsize=11)
    ax.set_ylabel('Actual', fontsize=11)
    ax.set_title('Confusion Matrix', fontsize=13, fontweight='bold')
    plt.tight_layout()
    return chart_to_base64(fig)
