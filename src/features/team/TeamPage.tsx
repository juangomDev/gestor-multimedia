import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useAuth } from '../../context/useAuth';
import { NotificationBell } from '../notifications/NotificationBell';
import { AuditLogsPanel } from '../admin/AuditLogsPanel';
import { StorageStatsPanel } from '../admin/StorageStatsPanel';
import { UsersDirectoryPanel } from './UsersDirectoryPanel';
import styles from './TeamPage.module.css';

/**
 * Vista de Gestión de Equipo (`/team`, accesible para `MANAGER` y `ADMIN`), cargada con `React.lazy`.
 * Incluye pestaña principal de **Colaboradores** (CRUD jerárquico RBAC) y pestaña secundaria
 * de **Actividad y cuota** consumiendo `/api/v1/audit-logs` y `/api/v1/stats/storage` bajo demanda.
 */
export const TeamPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');

  return (
    <div className={styles.page} data-testid="team-page">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h1 className={styles.title}>Mi equipo</h1>
          <p className={styles.subtitle}>
            {isAdmin
              ? 'Administra colaboradores y gestores, y revisa la actividad y cuota operativa.'
              : 'Administra tus colaboradores, permisos de acceso, actividad reciente y cuota de almacenamiento.'}
          </p>
        </div>
        <NotificationBell />
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'members' | 'activity')}
      >
        <TabsList>
          <TabsTrigger value="members">Colaboradores</TabsTrigger>
          <TabsTrigger value="activity">Actividad y cuota</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <UsersDirectoryPanel />
        </TabsContent>

        <TabsContent value="activity">
          <div className={styles.activityStack} data-testid="team-activity-tab">
            <StorageStatsPanel enabled={activeTab === 'activity'} />
            <section>
              <h2 className={styles.subSectionTitle}>Actividad reciente del equipo</h2>
              <AuditLogsPanel
                enabled={activeTab === 'activity'}
                pageSize={20}
                hideAdminFilters={!isAdmin}
              />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamPage;
