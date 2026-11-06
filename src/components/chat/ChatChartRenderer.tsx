import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ChatChartData } from '../../services/chatService';
import styles from './ChatComponents.module.css';

/**
 * Propiedades del componente `ChatChartRenderer`.
 */
export interface ChatChartRendererProps {
  /** Datos de distribución numérica y porcentual devueltos por el backend. */
  chartData?: ChatChartData | null;
}

const esNumberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
});

/**
 * Formatea un valor numérico utilizando la convención regional en español (`es-ES`).
 */
function formatSpanishNumber(val: number): string {
  if (!Number.isFinite(val)) return '0';
  return esNumberFormatter.format(val);
}

/**
 * Renderiza automáticamente un gráfico estadístico interactivo (barras horizontales o verticales)
 * con porcentajes y formateo numérico en español cuando la respuesta de chat incluye `chartData`.
 */
export const ChatChartRenderer: React.FC<ChatChartRendererProps> = ({ chartData }) => {
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  if (!chartData || !Array.isArray(chartData.labels) || chartData.labels.length === 0) {
    return null;
  }

  const maxVal = Math.max(...chartData.values.map((v) => Math.abs(v || 0)), 1);

  const items = chartData.labels.map((label, idx) => {
    const rawValue = chartData.values[idx] ?? 0;
    const rawPct =
      chartData.percentages[idx] !== undefined
        ? chartData.percentages[idx]
        : Math.round((Math.abs(rawValue) / maxVal) * 1000) / 10;
    const widthPct = Math.min(100, Math.max(4, Math.abs(rawPct)));
    return {
      label,
      value: rawValue,
      percentage: rawPct,
      barPct: widthPct,
    };
  });

  return (
    <div className={styles.chartContainer} aria-label="Gráfico estadístico de datos">
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <BarChart3 size={13} />
          <span>Visualización Estadística ({items.length} categorías)</span>
        </span>

        <div className={styles.chartModeToggle} role="group" aria-label="Orientación del gráfico">
          <button
            type="button"
            className={`${styles.modeBtn} ${
              orientation === 'horizontal' ? styles.modeBtnActive : ''
            }`}
            onClick={() => setOrientation('horizontal')}
          >
            Horizontal
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${
              orientation === 'vertical' ? styles.modeBtnActive : ''
            }`}
            onClick={() => setOrientation('vertical')}
          >
            Vertical
          </button>
        </div>
      </div>

      {orientation === 'horizontal' ? (
        <div className={styles.horizontalBars}>
          {items.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className={styles.barRow}>
              <div className={styles.barLabelRow}>
                <span className={styles.barLabelText} title={item.label}>
                  {item.label}
                </span>
                <span className={styles.barValueText}>
                  {formatSpanishNumber(item.value)} ({formatSpanishNumber(item.percentage)}%)
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${item.barPct}%` }}
                  role="progressbar"
                  aria-valuenow={item.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.label}: ${formatSpanishNumber(item.value)} (${formatSpanishNumber(item.percentage)}%)`}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.verticalBars}>
          {items.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className={styles.vBarCol}>
              <span className={styles.vBarPercent}>
                {formatSpanishNumber(item.percentage)}%
              </span>
              <div
                className={styles.vBarTrack}
                title={`${item.label}: ${formatSpanishNumber(item.value)} (${formatSpanishNumber(item.percentage)}%)`}
              >
                <div
                  className={styles.vBarFill}
                  style={{ height: `${item.barPct}%` }}
                />
              </div>
              <span className={styles.vBarLabel} title={item.label}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
