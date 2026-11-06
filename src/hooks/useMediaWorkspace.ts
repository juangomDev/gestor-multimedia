import { useState, useEffect, useCallback } from 'react';
import { imagesService } from '../services/imagesService';
import { tablesService } from '../services/tablesService';
import { foldersService } from '../services/foldersService';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import type { ImageItem, TableItem, FolderItem } from '../types/media';

/**
 * Objetivo de movimiento de archivo hacia una carpeta.
 */
export interface MovingTarget {
  item: ImageItem | TableItem;
  type: 'image' | 'table';
}

/**
 * Custom hook que encapsula el estado y operaciones del espacio de trabajo multimedia
 * (imágenes, tablas, carpetas en PostgreSQL, sincronización remota, subida, reasignación y eliminación).
 */
export function useMediaWorkspace() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [selectedTableForStudio, setSelectedTableForStudio] = useState<TableItem | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [movingTarget, setMovingTarget] = useState<MovingTarget | null>(null);

  const [images, setImages] = useState<ImageItem[]>(() => imagesService.getImages());
  const [tables, setTables] = useState<TableItem[]>(() => tablesService.getTables());
  const [folders, setFolders] = useState<FolderItem[]>(() => storageService.getFolders());

  /**
   * Refresca las colecciones en memoria desde el almacenamiento local sincronizado.
   */
  const refreshItems = useCallback(() => {
    setImages(imagesService.getImages());
    setTables(tablesService.getTables());
    setFolders(storageService.getFolders());
  }, []);

  /**
   * Sincroniza imágenes, tablas y carpetas con PostgreSQL en `monolith-backend`.
   */
  const syncRemote = useCallback(async () => {
    try {
      const [, , foldersRes] = await Promise.allSettled([
        imagesService.fetchRemoteImages(),
        tablesService.fetchRemoteTables(),
        foldersService.fetchFolders(),
      ]);
      setImages(imagesService.getImages());
      setTables(tablesService.getTables());
      if (foldersRes.status === 'fulfilled') {
        setFolders(foldersRes.value);
      } else {
        setFolders(storageService.getFolders());
      }
    } catch (e) {
      console.warn('Remote sync error:', e);
    }
  }, []);

  /**
   * Ejecuta una sincronización manual mostrando notificaciones de progreso al usuario.
   */
  const handleManualSync = useCallback(async () => {
    showToast('Sincronizando con base de datos remota...', 'info');
    await syncRemote();
    showToast('Sincronización completada', 'success');
  }, [showToast, syncRemote]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;
    Promise.allSettled([
      imagesService.fetchRemoteImages(),
      tablesService.fetchRemoteTables(),
      foldersService.fetchFolders(),
    ])
      .then(([, , foldersRes]) => {
        if (!isCancelled) {
          setImages(imagesService.getImages());
          setTables(tablesService.getTables());
          if (foldersRes.status === 'fulfilled') {
            setFolders(foldersRes.value);
          } else {
            setFolders(storageService.getFolders());
          }
        }
      })
      .catch((e) => {
        console.warn('Remote sync error:', e);
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  /**
   * Procesa y sube una lista de archivos (imágenes o hojas de cálculo) al backend.
   */
  const handleFilesUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      showToast(`Iniciando subida de ${files.length} archivo(s)...`, 'info');
      const currentFolders = storageService.getFolders();
      const currentActiveFolder = currentFolders.find((f) => f.id === activeFolderId) || null;
      const imageFolderId =
        currentActiveFolder && currentActiveFolder.type === 'image'
          ? activeFolderId
          : currentActiveFolder === null
          ? activeFolderId
          : null;
      const tableFolderId =
        currentActiveFolder && currentActiveFolder.type === 'table'
          ? activeFolderId
          : currentActiveFolder === null
          ? activeFolderId
          : null;

      for (const file of files) {
        const isImage =
          file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
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
            const item = await imagesService.uploadImage(file, imageFolderId);
            showToast(`Imagen '${item.originalName}' subida (${item.shortCode})`, 'success');
          } else {
            const item = await tablesService.uploadTable(file, tableFolderId);
            showToast(`Tabla '${item.tableName}' subida (${item.shortCode})`, 'success');
          }
        } catch (err: any) {
          showToast(`Error al subir '${file.name}': ${err.message}`, 'error');
        }
      }

      refreshItems();
      void syncRemote();
    },
    [activeFolderId, refreshItems, showToast, syncRemote]
  );

  /**
   * Elimina una imagen en el servidor y actualiza el estado local.
   */
  const handleDeleteImage = useCallback(
    async (image: ImageItem) => {
      try {
        await imagesService.deleteImage(image.id, image.shortCode);
        showToast(`Imagen '${image.originalName}' eliminada`, 'info');
        refreshItems();
      } catch (err: any) {
        showToast(`Error al eliminar imagen en el servidor: ${err.message}`, 'error');
      }
    },
    [refreshItems, showToast]
  );

  /**
   * Elimina un dataset/tabla en el servidor y cierra el Data Studio si estaba abierto.
   */
  const handleDeleteTable = useCallback(
    async (table: TableItem) => {
      try {
        await tablesService.deleteTable(table.id, table.shortCode);
        showToast(`Tabla '${table.tableName}' eliminada`, 'info');
        setSelectedTableForStudio((prev) =>
          prev?.shortCode === table.shortCode ? null : prev
        );
        refreshItems();
      } catch (err: any) {
        showToast(`Error al eliminar tabla en el servidor: ${err.message}`, 'error');
      }
    },
    [refreshItems, showToast]
  );

  /**
   * Elimina una carpeta en cascada en PostgreSQL (`DELETE /api/v1/folders/:id`) protegiendo `General`.
   */
  const handleDeleteFolder = useCallback(
    async (folder: FolderItem) => {
      if (folder.name.trim().toLowerCase() === 'general') {
        showToast('La carpeta del sistema "General" no puede eliminarse', 'error');
        return;
      }
      try {
        await foldersService.deleteFolder(folder.id);
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        setActiveFolderId((prev) => (prev === folder.id ? null : prev));
        showToast(`Carpeta '${folder.name}' eliminada`, 'info');
        void syncRemote();
      } catch (err: any) {
        showToast(
          err?.detail || err?.message || `No se pudo eliminar la carpeta '${folder.name}'`,
          'error'
        );
      }
    },
    [showToast, syncRemote]
  );

  /**
   * Confirma la reasignación de carpeta en PostgreSQL (`PATCH /api/v1/images/:id/folder` o `/tables/:id/folder`).
   */
  const handleConfirmMove = useCallback(
    async (targetFolderId: string | null) => {
      if (!movingTarget) return;
      const resolvedFolderId =
        targetFolderId ??
        folders.find(
          (f) =>
            f.type === movingTarget.type && f.name.trim().toLowerCase() === 'general'
        )?.id ??
        null;

      try {
        if (movingTarget.type === 'image') {
          await foldersService.moveImageToFolder(
            (movingTarget.item as ImageItem).id,
            resolvedFolderId
          );
          showToast('Imagen movida con éxito', 'success');
        } else {
          await foldersService.moveTableToFolder(
            (movingTarget.item as TableItem).id,
            resolvedFolderId
          );
          showToast('Tabla movida con éxito', 'success');
        }
        setMovingTarget(null);
        refreshItems();
        void syncRemote();
      } catch (err: any) {
        showToast(
          err?.detail ||
            err?.message ||
            'Error o permisos RBAC insuficientes para mover el archivo',
          'error'
        );
      }
    },
    [folders, movingTarget, refreshItems, showToast, syncRemote]
  );

  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;
  const totalBytes =
    images.reduce((acc, i) => acc + (Number(i.sizeBytes) || 0), 0) +
    tables.reduce((acc, t) => acc + (Number(t.sizeBytes) || 0), 0);

  return {
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
    handleDeleteFolder,
    handleConfirmMove,
  };
}
