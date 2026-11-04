import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  RefreshCw,
} from 'lucide-react';
import { tablesService } from '../services/tablesService';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../context/useToast';
import { Button } from '../components/common/Button';
import type { TableItem } from '../types/media';
import styles from './TableDataStudioView.module.css';

interface TableDataStudioViewProps {
  table: TableItem;
  onBack: () => void;
}

export const TableDataStudioView: React.FC<TableDataStudioViewProps> = ({ table, onBack }) => {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>(table.columns || []);
  const [totalRows, setTotalRows] = useState(table.rowCount || 0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const loadData = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      try {
        const res = await tablesService.getTableData(table.shortCode, targetPage, targetLimit);
        setRows(res.data);
        setTotalRows(res.meta.total);
        setTotalPages(res.meta.totalPages);
        setPage(res.meta.page);

        if (res.data.length > 0 && (!columns || columns.length === 0)) {
          setColumns(Object.keys(res.data[0]));
        }
      } catch {
        if (table.demoRows) {
          setRows(table.demoRows);
          setColumns(table.columns || Object.keys(table.demoRows[0] || {}));
          setTotalRows(table.demoRows.length);
          setTotalPages(1);
        } else {
          showToast('No se pudieron consultar los datos del backend', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [table.shortCode, table.columns, table.demoRows, columns, showToast]
  );

  useEffect(() => {
    let isCancelled = false;
    tablesService
      .getTableData(table.shortCode, page, limit)
      .then((res) => {
        if (isCancelled) return;
        setRows(res.data);
        setTotalRows(res.meta.total);
        setTotalPages(res.meta.totalPages);
        setPage(res.meta.page);

        if (res.data.length > 0 && (!columns || columns.length === 0)) {
          setColumns(Object.keys(res.data[0]));
        }
      })
      .catch(() => {
        if (isCancelled) return;
        if (table.demoRows) {
          setRows(table.demoRows);
          setColumns(table.columns || Object.keys(table.demoRows[0] || {}));
          setTotalRows(table.demoRows.length);
          setTotalPages(1);
        } else {
          showToast('No se pudieron consultar los datos del backend', 'error');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [table.shortCode, table.columns, table.demoRows, page, limit, columns, showToast]);

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(table.url);
    if (success) {
      showToast('URL del endpoint de datos copiada', 'success');
    }
  };

  const handleDownload = () => {
    const url = tablesService.getDownloadUrl(table.shortCode);
    window.open(url, '_blank');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  // Filter & Sort
  const processedRows = useMemo(() => {
    let result = [...rows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      result.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        return (valA > valB ? 1 : -1) * (sortAsc ? 1 : -1);
      });
    }

    return result;
  }, [rows, searchQuery, sortCol, sortAsc]);

  const renderCellContent = (value: any) => {
    if (value === null || value === undefined) {
      return <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>null</span>;
    }

    const str = String(value);
    const upper = str.toUpperCase();

    if (upper === 'ACTIVE' || upper === 'COMPLETADO' || upper === 'SUCCESS') {
      return <span className={`${styles.statusBadge} ${styles.statusActive}`}>{str}</span>;
    }
    if (upper === 'PENDING' || upper === 'EN_PROGRESO' || upper === 'OBSERVACION') {
      return <span className={`${styles.statusBadge} ${styles.statusPending}`}>{str}</span>;
    }
    if (upper === 'FAILED' || upper === 'ERROR' || upper === 'INACTIVE') {
      return <span className={`${styles.statusBadge} ${styles.statusFailed}`}>{str}</span>;
    }

    return str;
  };

  return (
    <div className={styles.studio} data-testid="table-data-studio">
      {/* Top Header */}
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
            Datasets
          </Button>
          <h2 className={styles.title}>{table.tableName}</h2>
          <div className={styles.badges}>
            <span className={styles.rowsBadge}>{totalRows.toLocaleString()} Filas</span>
            <span className={styles.shortCodeBadge}>{table.shortCode}</span>
          </div>
        </div>

        <div className={styles.topActions}>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => loadData(page, limit)}
            title="Recargar datos"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={14} />}
            onClick={handleCopyUrl}
          >
            Copiar API
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleDownload}
          >
            Descargar
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className={styles.searchInput}
              style={{ paddingLeft: 32 }}
              placeholder="Filtrar filas por cualquier valor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Filas por pág:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className={styles.select}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>

          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </Button>

            <span className={styles.pageIndicator}>
              Página {page} de {Math.max(1, totalPages)}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className={styles.gridContainer}>
        {loading && rows.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            Cargando dataset desde el servidor...
          </div>
        ) : processedRows.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            {searchQuery
              ? 'No se encontraron filas que coincidan con la búsqueda.'
              : 'El archivo no contiene filas de datos.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  className={styles.th}
                  style={{ width: 50, textAlign: 'center', cursor: 'default' }}
                >
                  #
                </th>
                {columns.map((col) => (
                  <th key={col} className={styles.th} onClick={() => handleSort(col)}>
                    <div className={styles.thContent}>
                      <span>{col}</span>
                      <ArrowUpDown size={12} style={{ opacity: sortCol === col ? 1 : 0.4 }} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${styles.row} ${idx % 2 === 1 ? styles.rowStriped : ''}`}
                >
                  <td
                    className={styles.td}
                    style={{
                      width: 50,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                    }}
                  >
                    {(page - 1) * limit + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className={styles.td}>
                      {renderCellContent(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
