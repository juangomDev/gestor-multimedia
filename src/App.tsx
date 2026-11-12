import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/useAuth';
import { Sidebar, type WorkspaceView } from './components/layout/Sidebar';
import { MainExplorerHeader } from './components/folders/MainExplorerHeader';
import { FolderGridCard } from './components/folders/FolderGridCard';
import { UnifiedExplorerView } from './views/UnifiedExplorerView';
import { ImagesView } from './views/ImagesView';
import { TablesCatalogView } from './views/TablesCatalogView';
import { TableDataStudioView } from './views/TableDataStudioView';
import { LoginView } from './views/LoginView';
import { UserProfilesView } from './views/UserProfilesView';
import { SettingsView } from './views/SettingsView';
import { ChatStudioView } from './views/ChatStudioView';
import { AuditLogsView } from './views/AuditLogsView';
import { PdfsCatalogView } from './views/PdfsCatalogView';
import { FormsStudioView } from './views/FormsStudioView';
import { DropzoneOverlay } from './components/upload/DropzoneOverlay';
import { UploadModal } from './components/upload/UploadModal';
import { CreateFolderModal } from './components/folders/CreateFolderModal';
import { EditFolderModal } from './components/folders/EditFolderModal';
import { ShareFolderModal } from './components/folders/ShareFolderModal';
import { MoveToFolderModal } from './components/folders/MoveToFolderModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { StatusBar } from './components/layout/StatusBar';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { pdfsService } from './services/pdfsService';
import { useMediaWorkspace } from './hooks/useMediaWorkspace';
import type { ImageItem, TableItem, FolderItem } from './types/media';

/** Feature Flag: Gestión de carpetas descongelada y conectada a PostgreSQL (`monolith-backend`). */
const ENABLE_FOLDERS = true;

/**
 * Contenedor principal autenticado que coordina el layout compacto, explorador unificado en `<main>` y modales globales.
 */
const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<WorkspaceView>(() =>
    authService.getSession()?.token ? 'images' : 'login'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfsCount, setPdfsCount] = useState(() => storageService.getPdfs().length);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [sharingFolder, setSharingFolder] = useState<FolderItem | null>(null);

  const {
    images, tables, folders, activeFolder, activeFolderId, setActiveFolderId,
    selectedTableForStudio, setSelectedTableForStudio, movingTarget, setMovingTarget,
    totalBytes, refreshItems, syncRemote, handleManualSync, handleFilesUpload,
    handleDeleteImage, handleDeleteTable, handleDeleteFolder, handleConfirmMove,
  } = useMediaWorkspace();

  const handleViewChange = (nextView: WorkspaceView) => {
    if (nextView === 'images' && activeFolder && activeFolder.type !== 'image') setActiveFolderId(null);
    else if (nextView === 'tables' && activeFolder && activeFolder.type !== 'table') setActiveFolderId(null);
    else if (nextView === 'pdfs' && activeFolder && activeFolder.type !== 'pdf') setActiveFolderId(null);
    setActiveView(nextView);
  };

  const handleOpenFolder = (folder: FolderItem) => {
    setActiveFolderId(folder.id);
    if (activeView !== 'images' && activeView !== 'tables' && activeView !== 'pdfs') {
      setActiveView('all');
    } else {
      const nextView: WorkspaceView =
        folder.type === 'container' ? 'all' : folder.type === 'table' ? 'tables' : folder.type === 'pdf' ? 'pdfs' : 'images';
      setActiveView(nextView);
    }
  };

  if (!isAuthenticated || activeView === 'login') {
    return (
      <LoginView
        onLoginSuccess={() => setActiveView('all')}
        onExploreDemo={() => setActiveView('all')}
      />
    );
  }

  if (selectedTableForStudio) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--bg-primary)', padding: '6px', boxSizing: 'border-box', overflow: 'hidden', display: 'flex' }}>
        <TableDataStudioView
          table={selectedTableForStudio}
          onBack={() => setSelectedTableForStudio(null)}
          onTableUpdated={() => refreshItems()}
        />
      </div>
    );
  }

  const isExplorerView =
    activeView === 'all' || activeView === 'images' || activeView === 'tables' ||
    activeView === 'pdfs' || activeView === 'forms';

  const currentLevelFolders = folders.filter((f) => {
    if ((f.parentId ?? null) !== (activeFolderId ?? null)) return false;
    if (!activeFolderId && (activeView === 'images' || activeView === 'tables' || activeView === 'pdfs')) {
      const cat = activeView === 'tables' ? 'table' : activeView === 'pdfs' ? 'pdf' : 'image';
      return f.type === 'container' || f.type === cat;
    }
    return true;
  });
  const childFoldersNode =
    ENABLE_FOLDERS && currentLevelFolders.length > 0 ? (
      <>
        {currentLevelFolders.map((folder) => (
          <FolderGridCard
            key={folder.id}
            folder={folder}
            onOpenFolder={handleOpenFolder}
            onEditFolder={setEditingFolder}
            onShareFolder={setSharingFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        ))}
      </>
    ) : undefined;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-primary)', padding: '6px', gap: '8px', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Sidebar
        activeView={activeView} onViewChange={handleViewChange} onOpenUpload={() => setIsUploadOpen(true)}
        onSync={handleManualSync} imagesCount={images.length} tablesCount={tables.length} pdfsCount={pdfsCount}
        totalBytes={totalBytes} activeFolderId={ENABLE_FOLDERS ? activeFolderId : null} onFolderChange={setActiveFolderId}
        onOpenNewFolder={() => setIsNewFolderOpen(true)} onEditFolder={setEditingFolder} onShareFolder={setSharingFolder}
        onDeleteFolder={handleDeleteFolder} folders={folders} foldersEnabled={false} explorerMode={true}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <main style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-panel)', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' }}>
        {isExplorerView && ENABLE_FOLDERS && (
          <MainExplorerHeader
            activeView={activeView} onViewChange={handleViewChange} folders={folders} activeFolder={activeFolder}
            activeFolderId={activeFolderId} onFolderChange={setActiveFolderId} onOpenNewFolder={() => setIsNewFolderOpen(true)}
            onEditFolder={setEditingFolder} onShareFolder={setSharingFolder} onDeleteFolder={handleDeleteFolder}
            imagesCount={images.length} tablesCount={tables.length} pdfsCount={pdfsCount} compactHeaderOnly={true}
          />
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'all' && (
            <UnifiedExplorerView
              folders={folders} activeFolder={activeFolder} images={images} tables={tables}
              pdfs={storageService.getPdfs()} pdfsCount={pdfsCount}
              searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenUpload={() => setIsUploadOpen(true)}
              onOpenNewFolder={() => setIsNewFolderOpen(true)} onOpenFolder={handleOpenFolder} onEditFolder={setEditingFolder}
              onShareFolder={setSharingFolder} onDeleteFolder={handleDeleteFolder} onDeleteImage={handleDeleteImage}
              onDeleteTable={handleDeleteTable}
              onDeletePdf={(pdf) => {
                void pdfsService.deletePdf(pdf.id).then(() => {
                  setPdfsCount(storageService.getPdfs().length);
                  refreshItems();
                });
              }}
              onOpenStudio={setSelectedTableForStudio}
              onMoveImageToFolder={(img) => setMovingTarget({ item: img, type: 'image' })}
              onMoveTableToFolder={(tbl) => setMovingTarget({ item: tbl, type: 'table' })}
              onViewChange={handleViewChange}
            />
          )}
          {activeView === 'images' && (
            <ImagesView
              images={images} activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'image' ? activeFolder : null}
              searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteImage={handleDeleteImage} onImageUpdated={() => refreshItems()} folders={folders}
              onBulkActionFinished={() => refreshItems()} leadingGridItems={childFoldersNode}
              onMoveImageToFolder={ENABLE_FOLDERS ? (img) => setMovingTarget({ item: img, type: 'image' }) : undefined}
            />
          )}
          {activeView === 'tables' && (
            <TablesCatalogView
              tables={tables} activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'table' ? activeFolder : null}
              searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenStudio={setSelectedTableForStudio}
              onOpenUpload={() => setIsUploadOpen(true)} onDeleteTable={handleDeleteTable} onTableUpdated={() => refreshItems()}
              folders={folders} onBulkActionFinished={() => refreshItems()} leadingGridItems={childFoldersNode}
              onMoveTableToFolder={ENABLE_FOLDERS ? (tbl) => setMovingTarget({ item: tbl, type: 'table' }) : undefined}
            />
          )}
          {activeView === 'pdfs' && (
            <PdfsCatalogView
              activeFolder={ENABLE_FOLDERS && activeFolder?.type === 'pdf' ? activeFolder : null}
              folders={folders} leadingGridItems={childFoldersNode}
              onPdfsUpdated={() => { setPdfsCount(storageService.getPdfs().length); void syncRemote(); }}
            />
          )}
          {activeView === 'forms' && <FormsStudioView />}
          {activeView === 'chat' && (
            <ChatStudioView folders={folders} tables={tables} onOpenTableInStudio={setSelectedTableForStudio} />
          )}
          {activeView === 'profiles' && <UserProfilesView onBackToGallery={() => setActiveView('images')} />}
          {activeView === 'audit' && <AuditLogsView onBackToGallery={() => setActiveView('images')} />}
          {activeView === 'settings' && (
            <SettingsView
              onBackToGallery={() => setActiveView('images')}
              onConfigSaved={() => { refreshItems(); void syncRemote(); }}
              onItemImported={() => { refreshItems(); void syncRemote(); }}
              folderId={ENABLE_FOLDERS ? activeFolderId : null}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
          )}
        </div>

        <StatusBar totalBytes={totalBytes} />
      </main>

      <DropzoneOverlay onFilesDropped={handleFilesUpload} />
      <UploadModal
        isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onFilesSelected={handleFilesUpload}
        folderName={ENABLE_FOLDERS ? activeFolder?.name : undefined} folderType={ENABLE_FOLDERS ? activeFolder?.type ?? null : null}
      />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />

      {ENABLE_FOLDERS && (
        <CreateFolderModal
          isOpen={isNewFolderOpen} onClose={() => setIsNewFolderOpen(false)}
          type={activeFolder?.type ?? (activeView === 'all' ? 'container' : activeView === 'tables' ? 'table' : activeView === 'pdfs' ? 'pdf' : 'image')}
          parentFolder={activeFolder}
          onFolderCreated={(created) => { handleOpenFolder(created); refreshItems(); void syncRemote(); }}
        />
      )}

      {ENABLE_FOLDERS && (
        <EditFolderModal
          folder={editingFolder} isOpen={!!editingFolder} onClose={() => setEditingFolder(null)}
          onFolderUpdated={(updated) => {
            if (editingFolder && activeFolderId === editingFolder.id) setActiveFolderId(updated.id);
            refreshItems(); void syncRemote();
          }}
        />
      )}

      {ENABLE_FOLDERS && (
        <ShareFolderModal
          folder={sharingFolder} isOpen={!!sharingFolder} onClose={() => setSharingFolder(null)}
          onSharesChanged={() => { void syncRemote(); }}
        />
      )}

      {ENABLE_FOLDERS && movingTarget && (
        <MoveToFolderModal
          isOpen={true} onClose={() => setMovingTarget(null)}
          itemName={movingTarget.type === 'image' ? (movingTarget.item as ImageItem).originalName : (movingTarget.item as TableItem).tableName}
          currentFolderId={movingTarget.item.folderId || null}
          folders={folders.filter((f) => f.type === movingTarget.type)}
          allFolders={folders}
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
