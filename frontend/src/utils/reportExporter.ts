import { client, API_BASE } from '../api/client';

export async function downloadReport(scanId: string, format: 'json' | 'pdf') {
  if (!scanId) return;

  try {
    const response = await client.get(`/reports/pipeline/${scanId}/${format}`, {
      responseType: 'blob',
    });

    const contentType = format === 'json' ? 'application/json' : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `secureflow-report-${scanId.substring(0, 8)}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Failed to download ${format} report via blob:`, error);
    // Fallback: direct browser navigation to backend URL
    const fullUrl = `${API_BASE}/api/v1/reports/pipeline/${scanId}/${format}`;
    window.open(fullUrl, '_blank');
  }
}
