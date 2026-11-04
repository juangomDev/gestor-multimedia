import { useState, useEffect, useCallback } from 'react';
import { imagesService } from '../services/imagesService';
import { tablesService } from '../services/tablesService';
import { storageService } from '../services/storageService';
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
 * (imágenes, tablas, carpetas, sincronización remota, subida y eliminación).
 */
export function useMediaWorkspace() {
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
   * Sincroniza imágenes y tablas con la base de datos remota del backend.
   */
  const syncRemote = useCallback(async () => {
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

  /**
   * Procesa y sube una lista de archivos (imágenes o hojas de cálculo) al backend.
   */
  const handleFilesUpload = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      showToast(`Iniciando subida de ${files.length} archivo(s)...`, 'info');

      for (const file of files) {
        const isImage =
          file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
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
   * Confirma la reasignación de carpeta para la imagen o tabla seleccionada.
   */
  const handleConfirmMove = useCallback(
    (targetFolderId: string | null) => {
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
    },
    [movingTarget, refreshItems, showToast]
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
    handleConfirmMove,
  };
}
