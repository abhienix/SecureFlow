import React, { useState, useMemo } from 'react';
import { FolderGit2, Search, Filter, Plus, ChevronRight, X, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useRepositories, useRegisterRepository } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import type { Repository } from '../../types';

export default function RepositoriesWorkspace() {
  const navigate = useNavigate();
  const { data: rawRepos, isLoading } = useRepositories();
  const registerRepo = useRegisterRepository();
  const repos = useMemo(() => rawRepos || [], [rawRepos]);

  const [search, setSearch] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [owner, setOwner] = useState('abhienix');
  const [successMsg, setSuccessMsg] = useState('');

  const filtered = repos.filter((r: Repository) =>
    (r.name || r.repo_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.owner || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim() || registerRepo.isPending) return;
    try {
      await registerRepo.mutateAsync({ repoName, owner });
      setSuccessMsg(`Registered repository ${repoName}`);
      setTimeout(() => { setIsRegisterOpen(false); setSuccessMsg(''); setRepoName(''); }, 1500);
    } catch (e) {
      console.error('Failed to register repo:', e);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={400} height={32} />
        <Skeleton height={50} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={180} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)' }}>Monitored GitHub Repositories</h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>GitHub portfolio security health scores, active deployments, and historical scan trends</p>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)}><Plus size={16} /> Register Repository</Button>
      </div>

      {/* Search */}
      <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <Search size={16} color="var(--sf-ink-low)" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search repositories by name, owner, branch..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--sf-ink)', fontSize: 13, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--sf-ink-low)' }}>
          <Filter size={14} /> Showing {filtered.length} of {repos.length} repositories
        </div>
      </Card>

      {/* Repository Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {filtered.map((repo: Repository) => (
          <Card key={repo.id || repo.name} hover
            style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer' }}
            {...({ onClick: () => navigate('/repositories/workspace', { state: { repo } } as any) } as any)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--sf-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderGit2 size={22} color="var(--sf-accent)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)' }}>{repo.name || repo.repo_name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>Default Branch: <strong style={{ color: 'var(--sf-ink-mid)' }}>{repo.default_branch || 'main'}</strong></span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: (repo.security_score || 94) >= 80 ? 'var(--sf-green)' : 'var(--sf-amber)' }}>{repo.security_score || 94} / 100</span>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>Security Score</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>Open Findings</span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: (repo.open_findings || 0) > 0 ? 'var(--sf-red)' : 'var(--sf-green)' }}>{repo.open_findings || 0} issues</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>DAST Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: repo.last_dast_status === 'completed' ? 'var(--sf-green)' : 'var(--sf-amber)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sf-ink)' }}>{repo.last_dast_status || 'completed'}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>Total Scans</span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--sf-ink)' }}>{repo.total_scans || 0} runs</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--sf-accent)', fontWeight: 700 }}>
              <span>Enter Repository Workspace</span><ChevronRight size={16} />
            </div>
          </Card>
        ))}
      </div>

      {/* Register Modal */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ width: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)' }}>Register New Repository</h3>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--sf-ink-low)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {successMsg ? (
              <div style={{ padding: 16, borderRadius: 8, background: 'var(--sf-green-soft)', color: 'var(--sf-green)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sf-ink-low)', marginBottom: 6 }}>Owner / Org Name</label>
                  <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. abhienix"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sf-ink-low)', marginBottom: 6 }}>Repository Name</label>
                  <input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="e.g. secureflow-microservice" required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <Button variant="secondary" type="button" onClick={() => setIsRegisterOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={registerRepo.isPending}>{registerRepo.isPending ? 'Registering...' : 'Connect Repository'}</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
