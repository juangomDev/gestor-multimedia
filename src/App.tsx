import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { ImagesView } from './views/ImagesView';
import { TablesCatalogView } from './views/TablesCatalogView';
import { TableDataStudioView } from './views/TableDataStudioView';
import { LoginView } from './views/LoginView';
import { UserProfilesView } from './views/UserProfilesView';
import { SettingsView } from './views/SettingsView';
import { DropzoneOverlay } from './components/upload/DropzoneOverlay';
import { UploadModal } from './components/upload/UploadModal';
import { CreateFolderModal } from './components/folders/CreateFolderModal';
import { MoveToFolderModal } from './components/folders/MoveToFolderModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { StatusBar } from './components/layout/StatusBar';
import { authService } from './services/authService';
import { useMediaWorkspace } from './hooks/useMediaWorkspace';
import type { ImageItem, TableItem } from './types/media';

// Feature Flag: Las carpetas quedan congeladas en el frontend hasta que se implemente la persistencia en PostgreSQL en monolith-backend
const ENABLE_FOLDERS = false;

/**
 * Contenedor principal autenticado que coordina el layout, vistas activas y modales globales.
 */
const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<
    'images' | 'tables' | 'profiles' | 'login' | 'settings'
  >(() => (authService.getSession()?.token ? 'images' : 'login'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const {
    images,
    tables,
    folders,
    activeFolder,
    activeFolderId,
    setActiveFolderId,
    selectedTableForStudio,
    setSelectedTableForStudio,
    movingTarget,
    setMovingTarget,
    totalBytes,
    refreshItems,
    syncRemote,
    handleManualSync,
    handleFilesUpload,
    handleDeleteImage,
    handleDeleteTable,
    handleConfirmMove,
  } = useMediaWorkspace();

  if (!isAuthenticated || activeView === 'login') {
    return (
      <LoginView
        onLoginSuccess={() => setActiveView('images')}
        onExploreDemo={() => setActiveView('images')}
      />
    );
  }

  if (selectedTableForStudio) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          padding: '10px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <TableDataStudioView
          table={selectedTableForStudio}
          onBack={() => setSelectedTableForStudio(null)}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
        padding: '10px',
        gap: '10px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenUpload={() => setIsUploadOpen(true)}
        onSync={handleManualSync}
        imagesCount={images.length}
        tablesCount={tables.length}
        totalBytes={totalBytes}
        activeFolderId={ENABLE_FOLDERS ? activeFolderId : null}
        onFolderChange={setActiveFolderId}
        onOpenNewFolder={() => setIsNewFolderOpen(true)}
        folders={folders}
        foldersEnabled={ENABLE_FOLDERS}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <main
        style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-panel)',
          background: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeView === 'images' && (
            <ImagesView
              images={images}
              activeFolder={ENABLE_FOLDERS ? activeFolder : null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteImage={handleDeleteImage}
              onMoveImageToFolder={
                ENABLE_FOLDERS
                  ? (img) => setMovingTarget({ item: img, type: 'image' })
                  : undefined
              }
            />
          )}
          {activeView === 'tables' && (
            <TablesCatalogView
              tables={tables}
              activeFolder={ENABLE_FOLDERS ? activeFolder : null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenStudio={setSelectedTableForStudio}
              onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteTable={handleDeleteTable}
              onMoveTableToFolder={
                ENABLE_FOLDERS
                  ? (tbl) => setMovingTarget({ item: tbl, type: 'table' })
                  : undefined
              }
            />
          )}
          {activeView === 'profiles' && (
            <UserProfilesView onBackToGallery={() => setActiveView('images')} />
          )}
          {activeView === 'settings' && (
            <SettingsView
              onBackToGallery={() => setActiveView('images')}
              onConfigSaved={() => {
                refreshItems();
                void syncRemote();
              }}
              onItemImported={() => {
                refreshItems();
                void syncRemote();
              }}
              folderId={ENABLE_FOLDERS ? activeFolderId : null}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
          )}
        </div>

        <StatusBar totalBytes={totalBytes} />
      </main>

      <DropzoneOverlay onFilesDropped={handleFilesUpload} />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFilesSelected={handleFilesUpload}
        folderName={ENABLE_FOLDERS ? activeFolder?.name : undefined}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {ENABLE_FOLDERS && (
        <CreateFolderModal
          isOpen={isNewFolderOpen}
          onClose={() => setIsNewFolderOpen(false)}
          type={activeView === 'images' ? 'image' : 'table'}
          onFolderCreated={() => refreshItems()}
        />
      )}

      {ENABLE_FOLDERS && movingTarget && (
        <MoveToFolderModal
          isOpen={true}
          onClose={() => setMovingTarget(null)}
          itemName={
            movingTarget.type === 'image'
              ? (movingTarget.item as ImageItem).originalName
              : (movingTarget.item as TableItem).tableName
          }
          currentFolderId={movingTarget.item.folderId || null}
          folders={folders.filter((f) => f.type === movingTarget.type)}
          onMove={handleConfirmMove}
        />
      )}
    </div>
  );
};

/**
 * Componente raíz de la aplicación Gestor Multimedia con proveedores de autenticación y notificaciones.
 */
export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
