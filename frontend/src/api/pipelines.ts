import { client } from './client';

export const pipelinesApi = {
  getPipelines: async (limit = 100) => {
    const res = await client.get(`/pipelines?limit=${limit}`);
    return res.data;
  },
  getPipelineDetail: async (id: string) => {
    const res = await client.get(`/pipelines/${id}`);
    return res.data;
  },
  getPipelineLogs: async (runId: string, stageId: string) => {
    const res = await client.get(`/pipelines/${runId}/stages/${stageId}/logs`);
    return res.data;
  },
  getPipelineFindings: async (runId: string) => {
    const res = await client.get(`/pipelines/${runId}/findings`);
    return res.data;
  },
  getLatestPipeline: async () => {
    const res = await client.get('/pipelines/latest');
    return res.data;
  },
};
