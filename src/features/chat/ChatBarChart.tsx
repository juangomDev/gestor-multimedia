import React from 'react';
import type { ChatChartData } from '../../types/chat';
import styles from './ChatBarChart.module.css';

/**
 * Propiedades del gráfico de barras editorial de Data Chat (`ChatBarChart`).
 */
export interface ChatBarChartProps {
  /** Serie numérica pre-calculada devuelta por `monolith-backend` (`labels`, `values`, `percentages`). */
  chartData: ChatChartData;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

/**
 * Visualización limpia de barras horizontales con tokens semánticos y `tabular-nums`
 * para respuestas analíticas que incluyen `chartData`.
 */
export const ChatBarChart: React.FC<ChatBarChartProps> = ({ chartData }) => {
  const labels = chartData.labels ?? [];
  const values = chartData.values ?? [];
  const percentages = chartData.percentages ?? [];

  const validEntries = labels
    .map((label, idx) => ({
      label,
      val: Number(values[idx] ?? 0),
      pct: percentages[idx],
    }))
    .filter((entry) => Number.isFinite(entry.val));

  if (validEntries.length === 0) return null;

  const maxVal = Math.max(...validEntries.map((e) => Math.abs(e.val)), 1);

  return (
    <figure className={styles.figure} data-testid="chat-bar-chart" aria-label="Gráfico de datos">
      <figcaption className={styles.caption}>Distribución numérica</figcaption>
      <div className={styles.bars}>
        {validEntries.map(({ label, val, pct }, idx) => {
          const barWidth = Math.max(4, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)));

          return (
            <div key={`${label}-${idx}`} className={styles.row}>
              <div className={styles.rowHeader}>
                <span className={styles.rowLabel} title={label}>
                  {label}
                </span>
                <span className={styles.rowMetrics}>
                  <span>{NUMBER_FORMATTER.format(val)}</span>
                  {pct !== undefined && pct !== null ? (
                    <span className={styles.rowPct}>
                      {typeof pct === 'number' ? `${pct.toFixed(1)}%` : String(pct)}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className={styles.track} aria-hidden="true">
                <div className={styles.fill} style={{ width: `${barWidth}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
};
