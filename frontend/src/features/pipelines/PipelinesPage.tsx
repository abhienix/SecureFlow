import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePipelineRuns } from './hooks/usePipelineRuns';
import { usePipelinePolling } from './hooks/usePipelinePolling';
import PipelineCard from './PipelineCard';
import PipelineDrawer from './PipelineDrawer';
import EmptyState from '../../components/common/EmptyState';
import { PipelineRun } from './types/pipeline.types';

export default function PipelinesPage() {
  const navigate = useNavigate();
  const { C } = useTheme();
  const { 
    runs, 
    isLoading, 
    isError, 
    refetch, 
    loadMore, 
    hasMore 
  } = usePipelineRuns(20);

  // Setup toast notification polling
  const { newRunToast, clearToast } = usePipelinePolling(runs);
  useEffect(() => {
    if (newRunToast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newRunToast, clearToast]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const [forcedSkipped, setForcedSkipped] = useState(false);

  const handleNodeClick = (stage: string, run: PipelineRun, forceSkipped: boolean) => {
    setSelectedStage(stage);
    setSelectedRun(run);
    setForcedSkipped(forceSkipped);
    setDrawerOpen(true);
  };

  const handleNavigateToSecurity = () => {
    setDrawerOpen(false);
    navigate('/security-center');
  };

  const handleNavigateToPolicies = () => {
    setDrawerOpen(false);
    navigate('/policies');
  };

  if (isLoading && runs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
        <div style={{ height: '40px', backgroundColor: C.bgElevated, borderRadius: '8px', width: '200px' }} className="sf-skeleton" />
        <div style={{ height: '120px', backgroundColor: C.bgElevated, borderRadius: '12px' }} className="sf-skeleton" />
        <div style={{ height: '120px', backgroundColor: C.bgElevated, borderRadius: '12px' }} className="sf-skeleton" />
        <style>{`
          @keyframes sf-pulse-skeleton {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
          .sf-skeleton {
            animation: sf-pulse-skeleton 1.5s infinite ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  if (isError && runs.length === 0) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        backgroundColor: C.bgCard, 
        borderRadius: '12px',
        border: `1px solid ${C.red}`,
        color: C.red
      }}>
        <h3>Failed to load pipeline audits</h3>
        <p style={{ fontSize: '13px', color: C.textSecondary }}>Check backend connections and try again.</p>
        <button 
          onClick={() => refetch()}
          style={{
            padding: '8px 16px',
            backgroundColor: C.red,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '12px'
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.ink, margin: '0 0 4px 0' }}>
          Pipeline Audits & Scans
        </h1>
        <p style={{ color: C.textSecondary, margin: 0, fontSize: '14px' }}>
          Real-time visual node graph mapping CI/CD progress, secret checks, SAST gates, and deployments.
        </p>
      </div>

      {/* Runs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {runs.length === 0 ? (
          <EmptyState
            title="No Pipeline Runs Executed Yet"
            description="Trigger a security analysis scan by pushing a commit to your git repository or running a CI/CD workflow."
            actionLabel="View Policy Engine"
            onAction={() => navigate('/policies')}
            secondaryLabel="Refresh Runs Feed"
            onSecondaryAction={() => refetch()}
          />
        ) : (
          runs.map((run, index) => (
            <PipelineCard
              key={run.id}
              run={run}
              isLatest={index === 0}
              onNodeClick={handleNodeClick}
            />
          ))
        )}
      </div>

      {/* Pagination Load More */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button
            onClick={loadMore}
            style={{
              padding: '10px 24px',
              backgroundColor: C.bgElevated,
              color: C.ink,
              border: `1px solid ${C.borderMid}`,
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = C.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.bgElevated}
          >
            Load More Pipeline Runs
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      <PipelineDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stage={selectedStage}
        run={selectedRun}
        forcedSkipped={forcedSkipped}
        onNavigateToSecurity={handleNavigateToSecurity}
        onNavigateToPolicies={handleNavigateToPolicies}
      />

      {/* New Run Toast Notification */}
      {newRunToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          backgroundColor: C.bgCard,
          border: `1px solid ${C.accent}`,
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: C.shadowLg,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '260px',
          animation: 'sf-toast-slide-up 200ms ease-out'
        }}>
          <div style={{
            backgroundColor: C.accentSoft,
            padding: '8px',
            borderRadius: '6px',
            color: C.accent
          }}>
            <GitBranch size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>
              New pipeline #{newRunToast.runNumber} started
            </div>
            <div style={{ fontSize: '11px', color: C.textSecondary }}>
              push to {newRunToast.branch} · {newRunToast.repo}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sf-toast-slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
