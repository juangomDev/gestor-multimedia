import React, { useState } from 'react';
import { Layers, Search, X, Settings, DownloadCloud, RefreshCw } from 'lucide-react';
import { HealthBadge } from '../health/HealthBadge';
import { UserMenu } from '../auth/UserMenu';
import { SettingsModal } from '../common/SettingsModal';
import { ImportShortCodeModal } from '../common/ImportShortCodeModal';
import styles from './Header.module.css';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onConfigChanged?: () => void;
  onItemImported?: () => void;
  onSync?: () => void;
  activeFolderId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onConfigChanged,
  onItemImported,
  onSync,
  activeFolderId,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Layers size={18} />
          </div>
          <span>Dokploy Media & Studio</span>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, extensión o shortCode (ej. 7xK9mP2vQ1)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={styles.clearSearchBtn}
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <HealthBadge />

        <button
          onClick={onSync}
          className={styles.settingsBtn}
          title="Sincronizar con Backend"
          aria-label="Sincronizar con Backend"
        >
          <RefreshCw size={17} />
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className={styles.settingsBtn}
          title="Importar por ShortCode"
          aria-label="Importar por ShortCode"
        >
          <DownloadCloud size={17} />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className={styles.settingsBtn}
          title="Ajustes de Conexión API"
          aria-label="Ajustes de Conexión API"
        >
          <Settings size={17} />
        </button>

        <UserMenu />

        <ImportShortCodeModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImported={onItemImported}
          folderId={activeFolderId}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={onConfigChanged}
        />
      </div>
    </header>
  );
};
