import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, GitBranch, Shield, Zap, Terminal } from 'lucide-react';
import { PipelineStageGraph } from '../../components/pipeline/PipelineStageGraph';
import { PipelineTimeline } from '../../components/pipeline/PipelineTimeline';
import { DrawerPanel } from '../../components/ui/DrawerPanel';
import { LogViewer } from '../../components/ui/LogViewer';
import Badge from '../../components/ui/Badge';
import { client } from '../../api/client';

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<any | null>(null);

  // Fetch Pipeline details
  const { data: run, isLoading } = useQuery({
    queryKey: ['pipelines', 'detail', id],
    queryFn: async () => {
      const res = await client.get(`/pipelines/${id}`);
      return res.data;
    },
    refetchInterval: (query: any) => (query.state.data?.status === 'running' ? 3000 : false),
  });

  // Fetch selected stage logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['pipelines', 'logs', id, selectedStage?.id],
    queryFn: async () => {
      const res = await client.get(`/pipelines/${id}/stages/${selectedStage.id}/logs`);
      return res.data;
    },
    enabled: !!id && !!selectedStage?.id,
  });

  if (isLoading) {
    return <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />;
  }

  if (!run) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--sf-danger)' }}>Pipeline run not found</h2>
        <button onClick={() => navigate('/pipelines')} style={{ marginTop: '16px' }}>
          Back to List
        </button>
      </div>
    );
  }

  const stages = (run.stages || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    duration: s.duration,
    stepsCount: s.steps?.length || 0,
  }));

  const timelineStages = (run.stages || []).map((s: any, idx: number) => {
    const durStr = s.duration || '5s';
    const durSec = parseFloat(durStr) || 5;
    return {
      name: s.name,
      startOffset: idx * 10,
      durationWidth: Math.min(50, durSec * 4),
      status: s.status,
      duration: durStr,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/pipelines')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sf-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            Pipeline Run #{run.run_number}
          </h1>
          <p style={{ color: 'var(--sf-text-muted)', margin: '2px 0 0 0', fontSize: '13px' }}>
            Repo: {run.repo_name} | Branch: {run.branch}
          </p>
        </div>
      </div>

      {/* Metadata Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          backgroundColor: 'var(--sf-bg-card)',
          border: '1px solid var(--sf-border)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
            Commit
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', marginTop: '4px', fontFamily: 'var(--sf-font-mono)' }}>
            {run.commit_sha?.substring(0, 8) || 'HEAD'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
            Message
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--sf-text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {run.commit_message || 'Manual scan trigger'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
            Policy Decision
          </div>
          <div style={{ marginTop: '4px' }}>
            <Badge variant={run.action_taken === 'BLOCK' ? 'failed' : 'success'}>
              {run.action_taken || 'ALLOW'}
            </Badge>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
            Total Duration
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sf-text-primary)', marginTop: '4px' }}>
            {run.duration || 45} seconds
          </div>
        </div>
      </div>

      {/* Horizontal Stage Graph */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Workflow Stages Flow
        </h2>
        <PipelineStageGraph stages={stages} onStageClick={(stage) => setSelectedStage(stage)} />
      </div>

      {/* Gantt Timeline */}
      <PipelineTimeline stages={timelineStages} onStageClick={(tStage) => {
        const matchingStage = run.stages.find((s: any) => s.name === tStage.name);
        if (matchingStage) setSelectedStage(matchingStage);
      }} />

      {/* Logs Drawer */}
      <DrawerPanel
        isOpen={!!selectedStage}
        onClose={() => setSelectedStage(null)}
        title={`${selectedStage?.name || 'Stage'} Console Logs`}
      >
        <div style={{ height: '400px' }}>
          {logsLoading ? (
            <div className="skeleton" style={{ height: '100%', borderRadius: '8px' }} />
          ) : (
            <LogViewer logs={logsData?.logs || 'No logs recorded.'} fileName={`${selectedStage?.name || 'stage'}.log`} />
          )}
        </div>
      </DrawerPanel>
    </div>
  );
}
