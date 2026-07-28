import { client } from './client';

export const metricsApi = {
  query: async (queryStr: string) => {
    const res = await client.get(`/metrics/query`, { params: { query: queryStr } });
    return res.data;
  },
  range: async (queryStr: string, start: number, end: number, step = 15) => {
    const res = await client.get(`/metrics/range`, {
      params: { query: queryStr, start, end, step },
    });
    return res.data;
  },
  getAlerts: async () => {
    const res = await client.get('/alerts');
    return res.data;
  },
  getTopology: async () => {
    const res = await client.get('/topology');
    return res.data;
  },
};
