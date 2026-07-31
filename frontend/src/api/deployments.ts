import { client } from './client';

export const deploymentsApi = {
  getDeployments: async () => {
    const res = await client.get('/deployments');
    return res.data;
  },
  getCurrentDeployment: async () => {
    const res = await client.get('/deployments/current');
    return res.data;
  },
  rollback: async (id: string) => {
    const res = await client.post(`/deployments/${id}/rollback`);
    return res.data;
  },
};
