import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import styles from './DiagnosticsCards.module.css';

/**
 * Propiedades del visor integrado de la consola Scalar.
 */
export interface ScalarDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** URL absoluta de `/docs` del backend configurado. */
  docsUrl: string;
}

/**
 * Modal con un iframe responsive que incrusta la consola interactiva Scalar (`GET /docs`).
 */
export const ScalarDocsModal: React.FC<ScalarDocsModalProps> = ({ isOpen, onClose, docsUrl }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Consola Scalar — API Reference" wide>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className={styles.specMeta}>
        <span>Origen:</span>
        <code>{docsUrl}</code>
        <a className={styles.linkBtn} href={docsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} />
          <span>Abrir en pestaña</span>
        </a>
      </div>
      <div className={styles.iframeWrap}>
        <iframe
          className={styles.iframe}
          src={docsUrl}
          title="Documentación Scalar de Monolith Backend"
        />
      </div>
    </div>
  </Modal>
);

