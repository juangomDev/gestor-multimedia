import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Download, Copy, RefreshCw } from 'lucide-react';
import { tablesService } from '../services/tablesService';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../context/useToast';
import { Button } from '../components/common/Button';
import { DataStudioToolbar } from '../components/tables/DataStudioToolbar';
import { DataGrid } from '../components/tables/DataGrid';
import type { TableItem } from '../types/media';
import styles from './TableDataStudioView.module.css';

/**
 * Propiedades del visor analítico Data Studio a pantalla completa.
 */
export interface TableDataStudioViewProps {
  table: TableItem;
  onBack: () => void;
}

/**
 * Vista de análisis tabular en pantalla completa con paginación server-side, búsqueda y ordenamiento.
 */
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

  /**
   * Consulta una página de registros del dataset desde el backend o usa filas locales de respaldo.
   */
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

  /**
   * Copia la URL del endpoint público del dataset al portapapeles.
   */
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(table.url);
    if (success) {
      showToast('URL del endpoint de datos copiada', 'success');
    }
  };

  /**
   * Abre la URL de descarga directa del archivo original en una nueva pestaña.
   */
  const handleDownload = () => {
    const url = tablesService.getDownloadUrl(table.shortCode);
    window.open(url, '_blank');
  };

  /**
   * Alterna el ordenamiento ascendente/descendente para la columna seleccionada.
   */
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

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

  return (
    <div className={styles.studio} data-testid="table-data-studio">
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

      <DataStudioToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
      />

      <DataGrid
        columns={columns}
        rows={processedRows}
        rawRowsCount={rows.length}
        loading={loading}
        searchQuery={searchQuery}
        page={page}
        limit={limit}
        sortCol={sortCol}
        onSort={handleSort}
      />
    </div>
  );
};
