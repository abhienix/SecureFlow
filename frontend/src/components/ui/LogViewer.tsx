import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Search, AlertCircle, ArrowDown } from 'lucide-react';

interface LogViewerProps {
  logs: string;
  fileName?: string;
}

export function LogViewer({ logs, fileName = 'pipeline.log' }: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorLines, setErrorLines] = useState<number[]>([]);

  const parsedLines = useMemo(() => {
    return logs.split('\n').map((line, idx) => {
      let level: 'info' | 'error' | 'warn' | 'debug' | 'normal' = 'normal';
      const upper = line.toUpperCase();
      if (upper.includes('ERROR') || upper.includes('FAIL') || upper.includes('EXCEPTION')) level = 'error';
      else if (upper.includes('WARN')) level = 'warn';
      else if (upper.includes('INFO') || upper.includes('SUCCESS')) level = 'info';
      else if (upper.includes('DEBUG')) level = 'debug';

      return {
        lineNumber: idx + 1,
        content: line,
        level,
      };
    });
  }, [logs]);

  // Keep track of error lines for "Jump to error"
  useEffect(() => {
    const errs = parsedLines
      .filter((l) => l.level === 'error')
      .map((l) => l.lineNumber);
    setErrorLines(errs);
  }, [parsedLines]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
  };

  const jumpToError = () => {
    if (errorLines.length > 0 && containerRef.current) {
      const firstErrLine = errorLines[0];
      const element = document.getElementById(`log-line-${firstErrLine}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setAutoScroll(false);
      }
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLineColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#f87171'; // red
      case 'warn':
        return '#fbbf24'; // amber
      case 'info':
        return '#60a5fa'; // blue
      case 'debug':
        return '#64748b'; // muted
      default:
        return '#f8fafc'; // light
    }
  };

  const filteredLines = useMemo(() => {
    if (!searchQuery) return parsedLines;
    const q = searchQuery.toLowerCase();
    return parsedLines.filter((l) => l.content.toLowerCase().includes(q));
  }, [parsedLines, searchQuery]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#090d16',
        borderRadius: '8px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
      }}
    >
      {/* Controls Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={14} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '12px',
              width: '100%',
              maxWidth: '200px',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {errorLines.length > 0 && (
            <button
              onClick={jumpToError}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
                color: '#f87171',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={12} />
              Jump to Error ({errorLines.length})
            </button>
          )}

          <button
            onClick={downloadLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      {/* Logs Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {filteredLines.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
            No logs matching filter
          </div>
        ) : (
          filteredLines.map((line) => (
            <div
              key={line.lineNumber}
              id={`log-line-${line.lineNumber}`}
              style={{
                display: 'flex',
                gap: '16px',
                backgroundColor: line.level === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
              }}
            >
              {/* Line Number */}
              <span
                style={{
                  width: '32px',
                  textAlign: 'right',
                  color: '#475569',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {line.lineNumber}
              </span>

              {/* Log Line Content */}
              <span style={{ color: getLineColor(line.level), flex: 1 }}>
                {line.content}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Auto Scroll Indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            background: 'var(--sf-accent)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            boxShadow: 'var(--sf-shadow-lg)',
          }}
        >
          <ArrowDown size={12} />
          Scroll to Bottom
        </button>
      )}
    </div>
  );
}
export default LogViewer;
