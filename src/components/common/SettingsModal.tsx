import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { storageService, DEFAULT_CONFIG } from '../../services/storageService';
import { useToast } from '../../context/ToastContext';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const config = storageService.getConfig();
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveConfig({
      baseUrl: baseUrl.trim() || DEFAULT_CONFIG.baseUrl,
      apiKey: apiKey.trim(),
    });
    showToast('Configuración guardada exitosamente', 'success');
    onSaved?.();
    onClose();
  };

  const handleReset = () => {
    setBaseUrl(DEFAULT_CONFIG.baseUrl);
    setApiKey(DEFAULT_CONFIG.apiKey);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Conexión API">
      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="settings-base-url" className={styles.label}>
            URL Base de Monolith Backend
          </label>
          <input
            id="settings-base-url"
            type="text"
            className={styles.input}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3000"
          />
          <span className={styles.help}>
            Dirección del backend desplegado en Dokploy o en tu entorno local.
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="settings-api-key" className={styles.label}>
            X-API-Key de Sistema
          </label>
          <input
            id="settings-api-key"
            type="text"
            className={styles.input}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="mk_live_..."
          />
          <span className={styles.help}>
            Llave API de sistema para peticiones directas sin iniciar sesión como usuario.
          </span>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset}>
            Valores por defecto
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};
