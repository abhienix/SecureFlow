import { client, API_BASE } from '../api/client';

export async function downloadReport(scanId: string, format: 'json' | 'pdf') {
  if (!scanId) return;

  const password = window.prompt("🔒 Password Protected Export\nEnter export password (xoxo):");
  if (!password) {
    return;
  }

  if (password.trim().toLowerCase() !== 'xoxo') {
    alert("❌ Access Denied: Incorrect export password!");
    return;
  }

  try {
    const response = await client.get(`/reports/pipeline/${scanId}/${format}`, {
      params: { password: password.trim() },
      headers: { 'X-Export-Password': password.trim() },
      responseType: 'blob',
    });

    const contentType = format === 'json' ? 'application/json' : 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `secureflow-report-${scanId.replace('run-', '')}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    if (error?.response?.status === 403) {
      alert("❌ Access Denied: Incorrect export password!");
    } else {
      console.error(`Failed to download ${format} report via blob:`, error);
      const fullUrl = `${API_BASE}/api/v1/reports/pipeline/${scanId}/${format}?password=${encodeURIComponent(password.trim())}`;
      window.open(fullUrl, '_blank');
    }
  }
}

