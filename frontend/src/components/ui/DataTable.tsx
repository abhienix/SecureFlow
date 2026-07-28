import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import Button from './Button';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortAccessor?: keyof T;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  compact?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyCTA?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  rowsPerPage?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  compact = false,
  isLoading = false,
  emptyMessage = 'No records found',
  emptyCTA,
  selectable = false,
  onSelectionChange,
  rowsPerPage: initialRowsPerPage = 10,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
  }, [data, sortKey, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Selection
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = data.map((r) => r.id).filter((id) => id !== undefined);
      setSelectedIds(new Set(allIds));
      onSelectionChange?.(data);
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const toggleSelectRow = (row: T) => {
    const id = row.id;
    if (id === undefined) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Trigger callback
      const selected = data.filter((r) => next.has(r.id));
      onSelectionChange?.(selected);
      return next;
    });
  };

  const rowHeight = compact ? '40px' : '48px';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--sf-bg-card)',
        border: '1px solid var(--sf-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Table Scroller */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ height: '40px', backgroundColor: 'var(--sf-bg-surface)' }}>
              {selectable && (
                <th
                  style={{
                    width: '40px',
                    textAlign: 'center',
                    padding: '8px',
                    borderBottom: '1px solid var(--sf-border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.size === data.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const align = col.align || 'left';
                const isSortActive = sortKey === (col.sortAccessor || col.accessor);
                return (
                  <th
                    key={idx}
                    onClick={() => col.sortable && handleSort(String(col.sortAccessor || col.accessor))}
                    style={{
                      padding: '8px 16px',
                      borderBottom: '1px solid var(--sf-border)',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: isSortActive ? 'var(--sf-accent)' : 'var(--sf-text-secondary)',
                      textAlign: align,
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      width: col.width,
                      backgroundColor: 'var(--sf-bg-surface)',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
                        gap: '4px',
                        width: '100%',
                      }}
                    >
                      {col.header}
                      {col.sortable && (
                        <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
                          <ChevronUp
                            size={10}
                            style={{
                              color: isSortActive && sortDirection === 'asc' ? 'var(--sf-accent)' : 'var(--sf-text-muted)',
                            }}
                          />
                          <ChevronDown
                            size={10}
                            style={{
                              color: isSortActive && sortDirection === 'desc' ? 'var(--sf-accent)' : 'var(--sf-text-muted)',
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton rows (5 visible)
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} style={{ height: rowHeight }}>
                  {selectable && <td style={{ borderBottom: '1px solid var(--sf-border)', padding: '8px' }} />}
                  {columns.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--sf-border)',
                      }}
                    >
                      <div className="skeleton" style={{ height: '12px', width: '70%', borderRadius: '4px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--sf-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <Inbox size={48} style={{ color: 'var(--sf-text-muted)', opacity: 0.5 }} />
                    <p style={{ color: 'var(--sf-text-secondary)', fontSize: '14px', margin: 0 }}>
                      {emptyMessage}
                    </p>
                    {emptyCTA}
                  </div>
                </td>
              </tr>
            ) : (
              // Real data rows
              paginatedData.map((row, rIdx) => {
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id || rIdx}
                    style={{
                      height: rowHeight,
                      backgroundColor: isSelected ? 'var(--sf-bg-elevated)' : 'transparent',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--sf-bg-surface)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {selectable && (
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '8px',
                          borderBottom: '1px solid var(--sf-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    {columns.map((col, cIdx) => {
                      const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as string];
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: compact ? '8px 16px' : '12px 16px',
                            borderBottom: '1px solid var(--sf-border)',
                            fontSize: '13px',
                            color: 'var(--sf-text-primary)',
                            textAlign: col.align || 'left',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--sf-bg-surface)',
            borderTop: '1px solid var(--sf-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: 'var(--sf-text-secondary)',
          }}
        >
          {/* Rows count */}
          <div>
            Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
          </div>

          {/* Page controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--sf-bg-card)',
                  border: '1px solid var(--sf-border)',
                  borderRadius: '4px',
                  color: 'var(--sf-text-primary)',
                  padding: '2px 4px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DataTable;
