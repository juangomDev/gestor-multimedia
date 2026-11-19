import React from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router';
import { HardDrive, KeyRound, ScrollText, Server, Users } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { UsersDirectoryPanel } from '../team/UsersDirectoryPanel';
import { AuditLogsPanel } from './AuditLogsPanel';
import { ApiKeysPanel } from './ApiKeysPanel';
import { StorageStatsPanel } from './StorageStatsPanel';
import { SystemPanel } from './SystemPanel';
import styles from './AdminPage.module.css';

const ADMIN_TABS = [
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/audit', label: 'Auditoría', icon: ScrollText },
  { to: '/admin/api-keys', label: 'API Keys', icon: KeyRound },
  { to: '/admin/storage', label: 'Almacenamiento', icon: HardDrive },
  { to: '/admin/system', label: 'Sistema y API', icon: Server },
] as const;

/**
 * Panel de Administración y Sistema (`/admin/*`, exclusivo `ADMIN`), cargado con `React.lazy`.
 * Sincroniza sus 5 pestañas operativas directamente en la URL:
 * `/admin/users`, `/admin/audit`, `/admin/api-keys`, `/admin/storage` y `/admin/system`.
 */
export const AdminPage: React.FC = () => (
  <div className={styles.page} data-testid="admin-page">
    <header className={styles.header}>
      <div className={styles.headingGroup}>
        <h1 className={styles.title}>Sistema y API</h1>
        <p className={styles.subtitle}>
          Gobernanza global de usuarios, auditoría inmutable, API Keys, disco físico y contrato
          OpenAPI.
        </p>
      </div>
      <NotificationBell />
    </header>

    <nav className={styles.navTabs} aria-label="Secciones de administración">
      {ADMIN_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `${styles.navTab} ${isActive ? styles.navTabActive : ''}`
          }
        >
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>

    <Routes>
      <Route index element={<Navigate to="/admin/users" replace />} />
      <Route path="users" element={<UsersDirectoryPanel />} />
      <Route path="audit" element={<AuditLogsPanel />} />
      <Route path="api-keys" element={<ApiKeysPanel />} />
      <Route path="storage" element={<StorageStatsPanel />} />
      <Route path="system" element={<SystemPanel />} />
      <Route path="*" element={<Navigate to="/admin/users" replace />} />
    </Routes>
  </div>
);

export default AdminPage;
