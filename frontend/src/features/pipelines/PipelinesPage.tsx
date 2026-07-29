import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { usePipelineRuns } from './hooks/usePipelineRuns';
import { usePipelinePolling } from './hooks/usePipelinePolling';
import PipelineCard from './PipelineCard';
import PipelineDrawer from './PipelineDrawer';
import { PipelineRun } from './types/pipeline.types';

export default function PipelinesPage() {
  const navigate = useNavigate();
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
        <div style={{ height: '40px', backgroundColor: '#1E293B', borderRadius: '8px', width: '200px' }} className="sf-skeleton" />
        <div style={{ height: '120px', backgroundColor: '#1E293B', borderRadius: '12px' }} className="sf-skeleton" />
        <div style={{ height: '120px', backgroundColor: '#1E293B', borderRadius: '12px' }} className="sf-skeleton" />
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
        backgroundColor: '#1E293B', 
        borderRadius: '12px',
        border: '1px solid #EF4444',
        color: '#FCA5A5'
      }}>
        <h3>Failed to load pipeline audits</h3>
        <p style={{ fontSize: '13px', color: '#94A3B8' }}>Check backend connections and try again.</p>
        <button 
          onClick={() => refetch()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#EF4444',
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
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px 0' }}>
          Pipeline Audits & Scans
        </h1>
        <p style={{ color: '#94A3B8', margin: 0, fontSize: '14px' }}>
          Real-time visual node graph mapping CI/CD progress, secret checks, SAST gates, and deployments.
        </p>
      </div>

      {/* Runs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {runs.map((run, index) => (
          <PipelineCard
            key={run.id}
            run={run}
            isLatest={index === 0}
            onNodeClick={handleNodeClick}
          />
        ))}
      </div>

      {/* Pagination Load More */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button
            onClick={loadMore}
            style={{
              padding: '10px 24px',
              backgroundColor: '#1E293B',
              color: '#F1F5F9',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1E293B'}
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
          backgroundColor: '#1E293B',
          border: '1px solid #6366F1',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '260px',
          animation: 'sf-toast-slide-up 200ms ease-out'
        }}>
          <div style={{
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            padding: '8px',
            borderRadius: '6px',
            color: '#6366F1'
          }}>
            <GitBranch size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
              New pipeline #{newRunToast.runNumber} started
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
