import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient, shouldRetryQuery } from './queryClient';
import { queryKeys } from './queryKeys';
import { useFolderTreeQuery, useCreateFolderMutation } from './useFoldersQueries';
import { useImagesQuery, useUploadTableMutation } from './useMediaQueries';
import { useFormsListQuery, useSubscribeFormMutation } from './useFormsQueries';
import {
  useNotificationsListQuery,
  useUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
} from './useNotificationsQueries';
import { useUsersQuery, useUpdateUserStatusMutation } from './useAdminQueries';
import { ApiError } from '../services/apiClient';
import { foldersService } from '../services/foldersService';
import { imagesService } from '../services/imagesService';
import { tablesService } from '../services/tablesService';
import { formsService } from '../services/formsService';
import { notificationsService } from '../services/notificationsService';
import { usersService } from '../services/usersService';

function createWrapper(queryClient = createAppQueryClient()) {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe('TanStack Query Layer v2 (src/queries/)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shouldRetryQuery omite reintentos en errores 4xx y reintenta 1 vez en 5xx/red', () => {
    expect(shouldRetryQuery(0, new ApiError(401, 'UNAUTHORIZED', 'No autorizado'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(403, 'FORBIDDEN', 'Prohibido'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(404, 'NOT_FOUND', 'No encontrado'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(409, 'ENTRY_ALREADY_RESOLVED', 'Sellado'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(429, 'RATE_LIMIT', 'Demasiadas peticiones'))).toBe(false);

    expect(shouldRetryQuery(0, new ApiError(500, 'SERVER_ERROR', 'Fallo'))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(500, 'SERVER_ERROR', 'Fallo'))).toBe(false);
  });

  it('queryKeys genera claves jerárquicas consistentes por dominio', () => {
    expect(queryKeys.folders.tree()).toEqual(['folders', 'tree']);
    expect(queryKeys.tables.data('abc123', 2, 25)).toEqual(['tables', 'data', 'abc123', 2, 25]);
    expect(queryKeys.pdfs.extractedText('pdf01', 3)).toEqual(['pdfs', 'extractedText', 'pdf01', 3]);
    expect(queryKeys.notifications.unreadCount()).toEqual(['notifications', 'unreadCount']);
  });

  it('useFolderTreeQuery y useCreateFolderMutation consultan e invalidan caché de carpetas', async () => {
    const { queryClient, Wrapper } = createWrapper();
    vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue([
      { id: 'f-1', name: 'Proyecto', type: 'container', parentId: null, createdAt: '' },
    ]);
    vi.spyOn(foldersService, 'createFolder').mockResolvedValue({
      id: 'f-2',
      name: 'Fotos',
      type: 'image',
      parentId: 'f-1',
      createdAt: '',
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const treeHook = renderHook(() => useFolderTreeQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(treeHook.result.current.isSuccess).toBe(true));
    expect(treeHook.result.current.data?.[0].name).toBe('Proyecto');

    const createHook = renderHook(() => useCreateFolderMutation(), { wrapper: Wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync({
        name: 'Fotos',
        type: 'image',
        parentId: 'f-1',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.folders.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.storageStats.all });
  });

  it('useImagesQuery y useUploadTableMutation (.json) operan contra servicios sin estado', async () => {
    const { Wrapper } = createWrapper();
    vi.spyOn(imagesService, 'listImages').mockResolvedValue({
      items: [
        {
          id: 'img-1',
          shortCode: 'sc1',
          originalName: 'portada.webp',
          mimeType: 'image/webp',
          sizeBytes: 512,
          url: 'http://localhost:3000/i/sc1',
          createdAt: '',
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    const uploadSpy = vi.spyOn(tablesService, 'uploadTable').mockResolvedValue({
      id: 'tbl-1',
      shortCode: 'jsn1',
      tableName: 'datos.json',
      rowCount: 3,
      sizeBytes: 256,
      url: 'http://localhost:3000/t/jsn1',
      createdAt: '',
    });

    const imgHook = renderHook(() => useImagesQuery({ folderId: 'fld-img' }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(imgHook.result.current.isSuccess).toBe(true));
    expect(imgHook.result.current.data?.items[0].shortCode).toBe('sc1');

    const uploadHook = renderHook(() => useUploadTableMutation(), { wrapper: Wrapper });
    const file = new File(['[{"x":1}]'], 'datos.json', { type: 'application/json' });
    await act(async () => {
      await uploadHook.result.current.mutateAsync({ file, folderId: 'fld-tbl' });
    });
    expect(uploadSpy).toHaveBeenCalledWith(file, 'fld-tbl');
  });

  it('useMarkNotificationReadMutation aplica actualización optimista y revierte ante fallo', async () => {
    const { queryClient, Wrapper } = createWrapper();
    vi.spyOn(notificationsService, 'fetchNotifications').mockResolvedValue({
      data: [
        {
          id: 'n-1',
          type: 'FORM_NEW_ENTRY',
          title: 'Nueva entrada',
          message: 'Registro #1',
          read: false,
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(2);

    const listHook = renderHook(() => useNotificationsListQuery({ page: 1 }), { wrapper: Wrapper });
    const countHook = renderHook(() => useUnreadNotificationsCountQuery(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(listHook.result.current.isSuccess).toBe(true);
      expect(countHook.result.current.data).toBe(2);
    });

    let rejectMark!: (reason?: unknown) => void;
    vi.spyOn(notificationsService, 'markNotificationAsRead').mockImplementationOnce(
      () =>
        new Promise((_res, rej) => {
          rejectMark = rej;
        })
    );

    const markHook = renderHook(() => useMarkNotificationReadMutation(), { wrapper: Wrapper });

    act(() => {
      markHook.result.current.mutate('n-1');
    });

    // Estado optimista aplicado antes de resolver el servidor
    await waitFor(() => {
      expect(queryClient.getQueryData(queryKeys.notifications.unreadCount())).toBe(1);
    });

    // Fallo del servidor → rollback automático
    await act(async () => {
      rejectMark(new ApiError(500, 'FAIL', 'Error temporal'));
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(queryKeys.notifications.unreadCount())).toBe(2);
    });
  });

  it('useFormsListQuery y useSubscribeFormMutation actualizan caché de suscripción', async () => {
    const { queryClient, Wrapper } = createWrapper();
    vi.spyOn(formsService, 'listForms').mockResolvedValue([
      {
        id: 'frm-1',
        slug: 'contacto',
        title: 'Contacto',
        entryFieldsSchema: [],
        resolutionFieldsSchema: [],
        allowedResolutionStates: ['VALID', 'INVALID'],
        _count: { entries: 4 },
        createdAt: '',
      },
    ]);
    vi.spyOn(notificationsService, 'subscribeToForm').mockResolvedValue({
      formId: 'frm-1',
      notifyOnNewEntry: true,
      notifyOnResolution: false,
    });

    const formsHook = renderHook(() => useFormsListQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(formsHook.result.current.data?.[0]._count?.entries).toBe(4));

    const subHook = renderHook(() => useSubscribeFormMutation('frm-1'), { wrapper: Wrapper });
    await act(async () => {
      await subHook.result.current.mutateAsync({
        notifyOnNewEntry: true,
        notifyOnResolution: false,
      });
    });

    expect(queryClient.getQueryData(queryKeys.forms.subscription('frm-1'))).toEqual({
      subscribed: true,
      subscription: {
        formId: 'frm-1',
        notifyOnNewEntry: true,
        notifyOnResolution: false,
      },
    });
  });

  it('useUsersQuery y useUpdateUserStatusMutation actualizan el estado de usuario con optimismo', async () => {
    const { queryClient, Wrapper } = createWrapper();
    vi.spyOn(usersService, 'listUsers')
      .mockResolvedValueOnce([{ id: 'u-2', username: 'colab', role: 'COLLABORATOR', isActive: true }])
      .mockResolvedValueOnce([
        { id: 'u-2', username: 'colab', role: 'COLLABORATOR', isActive: false },
      ]);
    vi.spyOn(usersService, 'updateUserStatus').mockResolvedValue({
      user: { id: 'u-2', username: 'colab', role: 'COLLABORATOR', isActive: false },
    });

    const usersHook = renderHook(() => useUsersQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(usersHook.result.current.data?.[0].isActive).toBe(true));

    const statusHook = renderHook(() => useUpdateUserStatusMutation(), { wrapper: Wrapper });
    await act(async () => {
      await statusHook.result.current.mutateAsync({ userId: 'u-2', isActive: false });
    });

    expect(queryClient.getQueryData(queryKeys.users.list())).toEqual([
      expect.objectContaining({ id: 'u-2', isActive: false }),
    ]);
  });
});
