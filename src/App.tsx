import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/useAuth';
import { useToast } from './context/useToast';
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
import { imagesService } from './services/imagesService';
import { tablesService } from './services/tablesService';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import type { ImageItem, TableItem, FolderItem } from './types/media';

// Feature Flag: Las carpetas quedan congeladas en el frontend hasta que se implemente la persistencia en PostgreSQL en monolith-backend
const ENABLE_FOLDERS = false;

const MainApp: React.FC = () => {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<'images' | 'tables' | 'profiles' | 'login' | 'settings'>(
    () => (authService.getSession()?.token ? 'images' : 'login')
  );
  const [selectedTableForStudio, setSelectedTableForStudio] = useState<TableItem | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [movingTarget, setMovingTarget] = useState<{
    item: ImageItem | TableItem;
    type: 'image' | 'table';
  } | null>(null);

  const [images, setImages] = useState<ImageItem[]>(() => imagesService.getImages());
  const [tables, setTables] = useState<TableItem[]>(() => tablesService.getTables());
  const [folders, setFolders] = useState<FolderItem[]>(() => storageService.getFolders());

  const refreshItems = () => {
    setImages(imagesService.getImages());
    setTables(tablesService.getTables());
    setFolders(storageService.getFolders());
  };

  const syncRemote = async () => {
    try {
      await Promise.allSettled([
        imagesService.fetchRemoteImages(),
        tablesService.fetchRemoteTables(),
      ]);
      setImages(imagesService.getImages());
      setTables(tablesService.getTables());
    } catch (e) {
      console.warn('Remote sync error:', e);
    }
  };

  const handleManualSync = async () => {
    showToast('Sincronizando con base de datos remota...', 'info');
    await syncRemote();
    showToast('Sincronización completada', 'success');
  };

  useEffect(() => {
    let isCancelled = false;
    Promise.allSettled([
      imagesService.fetchRemoteImages(),
      tablesService.fetchRemoteTables(),
    ])
      .then(() => {
        if (!isCancelled) {
          setImages(imagesService.getImages());
          setTables(tablesService.getTables());
        }
      })
      .catch((e) => {
        console.warn('Remote sync error:', e);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleFilesUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    showToast(`Iniciando subida de ${files.length} archivo(s)...`, 'info');

    for (const file of files) {
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
      const isTable =
        file.type === 'text/csv' ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel') ||
        /\.(csv|xlsx|xls)$/i.test(file.name);

      if (!isImage && !isTable) {
        showToast(`Formato no soportado: ${file.name}`, 'error');
        continue;
      }

      try {
        if (isImage) {
          const item = await imagesService.uploadImage(file, activeFolderId);
          showToast(`Imagen '${item.originalName}' subida (${item.shortCode})`, 'success');
        } else {
          const item = await tablesService.uploadTable(file, activeFolderId);
          showToast(`Tabla '${item.tableName}' subida (${item.shortCode})`, 'success');
        }
      } catch (err: any) {
        showToast(`Error al subir '${file.name}': ${err.message}`, 'error');
      }
    }

    refreshItems();
    syncRemote();
  };

  const handleDeleteImage = async (image: ImageItem) => {
    try {
      await imagesService.deleteImage(image.id, image.shortCode);
      showToast(`Imagen '${image.originalName}' eliminada`, 'info');
      refreshItems();
    } catch (err: any) {
      showToast(`Error al eliminar imagen en el servidor: ${err.message}`, 'error');
    }
  };

  const handleDeleteTable = async (table: TableItem) => {
    try {
      await tablesService.deleteTable(table.id, table.shortCode);
      showToast(`Tabla '${table.tableName}' eliminada`, 'info');
      if (selectedTableForStudio?.shortCode === table.shortCode) {
        setSelectedTableForStudio(null);
      }
      refreshItems();
    } catch (err: any) {
      showToast(`Error al eliminar tabla en el servidor: ${err.message}`, 'error');
    }
  };

  const handleConfirmMove = (targetFolderId: string | null) => {
    if (!movingTarget) return;
    if (movingTarget.type === 'image') {
      storageService.moveImageToFolder((movingTarget.item as ImageItem).id, targetFolderId);
      showToast('Imagen movida con éxito', 'success');
    } else {
      storageService.moveTableToFolder((movingTarget.item as TableItem).id, targetFolderId);
      showToast('Tabla movida con éxito', 'success');
    }
    setMovingTarget(null);
    refreshItems();
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;

  const totalBytes =
    images.reduce((acc, i) => acc + (Number(i.sizeBytes) || 0), 0) +
    tables.reduce((acc, t) => acc + (Number(t.sizeBytes) || 0), 0);

  // Auth Guard: si el usuario no tiene sesión o la vista es 'login', mostrar LoginView
  if (!isAuthenticated || activeView === 'login') {
    return (
      <LoginView
        onLoginSuccess={() => setActiveView('images')}
        onExploreDemo={() => setActiveView('images')}
      />
    );
  }

  // When viewing Data Studio, frame it in a floating panel that does not touch screen edges
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
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'images' && (
            <ImagesView
              images={images}
              activeFolder={ENABLE_FOLDERS ? activeFolder : null}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenUpload={() => setIsUploadOpen(true)}
              onDeleteImage={handleDeleteImage}
              onMoveImageToFolder={ENABLE_FOLDERS ? (img) => setMovingTarget({ item: img, type: 'image' }) : undefined}
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
              onMoveTableToFolder={ENABLE_FOLDERS ? (tbl) => setMovingTarget({ item: tbl, type: 'table' }) : undefined}
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
                syncRemote();
              }}
              onItemImported={() => {
                refreshItems();
                syncRemote();
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
