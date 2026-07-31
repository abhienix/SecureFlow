import { client } from './client';

export interface FindingsParams {
  severity?: string;
  scanner?: string;
  repo?: string;
  status?: string;
}

export const securityApi = {
  getFindings: async (params?: FindingsParams) => {
    const res = await client.get(`/security/findings`, { params });
    return res.data;
  },
  getFindingDetail: async (id: string) => {
    const res = await client.get(`/security/findings/${id}`);
    return res.data;
  },
  updateFindingStatus: async (id: string, status: string) => {
    const res = await client.patch(`/security/findings/${id}`, { status });
    return res.data;
  },
  getSummary: async () => {
    const res = await client.get('/security/summary');
    return res.data;
  },
  getTrends: async (days = 30) => {
    const res = await client.get(`/security/trends?days=${days}`);
    return res.data;
  },
  getScannerComparison: async () => {
    const res = await client.get('/security/scanners/comparison');
    return res.data;
  },
};
