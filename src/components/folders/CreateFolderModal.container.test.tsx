import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateFolderModal } from './CreateFolderModal';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { foldersService } from '../../services/foldersService';
import type { FolderItem } from '../../types/media';

vi.mock('../../services/foldersService', () => ({
  foldersService: {
    createFolder: vi.fn(),
  },
}));

const mockParentFolder: FolderItem = {
  id: 'fld-juan-container',
  name: 'Juan',
  type: 'container',
  color: '#3b82f6',
  isPrivate: false,
  createdAt: '2026-11-01T10:00:00Z',
};

describe('CreateFolderModal — Selección de tipo Contenedor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite elegir el tipo Contenedor al crear una subcarpeta dentro de un contenedor', async () => {
    const onFolderCreated = vi.fn();
    vi.mocked(foldersService.createFolder).mockResolvedValue({
      id: 'fld-libreria',
      name: 'libreria',
      type: 'container',
      parentId: 'fld-juan-container',
      color: '#3b82f6',
      isPrivate: false,
      createdAt: '2026-11-01T10:05:00Z',
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <CreateFolderModal
            isOpen={true}
            onClose={vi.fn()}
            type="container"
            parentFolder={mockParentFolder}
            onFolderCreated={onFolderCreated}
          />
        </ToastProvider>
      </AuthProvider>
    );

    // Debe mostrar la opción Contenedor
    const contenedorBtn = screen.getByRole('button', { name: 'Contenedor' });
    expect(contenedorBtn).toBeInTheDocument();

    // Hacemos clic en Contenedor
    fireEvent.click(contenedorBtn);

    // Escribimos el nombre
    fireEvent.change(screen.getByLabelText(/Nombre de la carpeta/i), {
      target: { value: 'libreria' },
    });

    // Enviamos
    fireEvent.click(screen.getByRole('button', { name: /Crear Carpeta/i }));

    await waitFor(() => {
      expect(foldersService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'libreria',
          type: 'container',
          parentId: 'fld-juan-container',
        })
      );
      expect(onFolderCreated).toHaveBeenCalled();
    });
  });

  it('permite elegir el tipo Contenedor al crear una carpeta en la raíz', async () => {
    const onFolderCreated = vi.fn();
    vi.mocked(foldersService.createFolder).mockResolvedValue({
      id: 'fld-root-container',
      name: 'Departamentos',
      type: 'container',
      color: '#3b82f6',
      isPrivate: false,
      createdAt: '2026-11-01T10:00:00Z',
    });

    render(
      <AuthProvider>
        <ToastProvider>
          <CreateFolderModal
            isOpen={true}
            onClose={vi.fn()}
            type="container"
            parentFolder={null}
            onFolderCreated={onFolderCreated}
          />
        </ToastProvider>
      </AuthProvider>
    );

    const contenedorBtn = screen.getByRole('button', { name: 'Contenedor' });
    expect(contenedorBtn).toBeInTheDocument();
    fireEvent.click(contenedorBtn);

    fireEvent.change(screen.getByLabelText(/Nombre de la carpeta/i), {
      target: { value: 'Departamentos' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Crear Carpeta/i }));

    await waitFor(() => {
      expect(foldersService.createFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Departamentos',
          type: 'container',
        })
      );
    });
  });
});
