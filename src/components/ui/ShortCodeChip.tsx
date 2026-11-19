import React, { useState, useRef, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import styles from './ShortCodeChip.module.css';

/**
 * Prefijo público canónico del recurso en `monolith-backend`.
 */
export type ShortCodePrefix = 'i' | 't' | 'p';

/**
 * Propiedades del sello clicable `ShortCodeChip` (elemento firma de Archivo Editorial).
 */
export interface ShortCodeChipProps {
  /** Código corto opaco Base58 del recurso */
  shortCode: string;
  /** Prefijo visual opcional (`i`, `t`, `p`) para mostrar `t/k9x2a` */
  prefix?: ShortCodePrefix;
  /** URL pública completa a copiar al portapapeles; si se omite, copia `shortCode` */
  copyValue?: string;
  /** Callback opcional tras copiar exitosamente */
  onCopied?: (value: string) => void;
  /** Clase CSS opcional */
  className?: string;
}

/**
 * Chip monoespaciado clicable que exhibe el `shortCode` del archivo y copia la
 * capability URL pública en 1 clic con confirmación inline sin saturar la tarjeta.
 */
export const ShortCodeChip: React.FC<ShortCodeChipProps> = ({
  shortCode,
  prefix,
  copyValue,
  onCopied,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const displayLabel = prefix ? `${prefix}/${shortCode}` : shortCode;
  const payload = copyValue ?? shortCode;

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const ok = await copyToClipboard(payload);
    if (!ok) return;

    setCopied(true);
    onCopied?.(payload);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 1500);
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleCopy(e)}
      className={`${styles.chip} ${copied ? styles.copied : ''} ${className ?? ''}`}
      title={copied ? 'Enlace copiado' : `Copiar ${payload}`}
      aria-label={copied ? 'Enlace copiado al portapapeles' : `Copiar enlace ${displayLabel}`}
    >
      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      <span className={styles.codeText}>{copied ? 'Copiado' : displayLabel}</span>
    </button>
  );
};
