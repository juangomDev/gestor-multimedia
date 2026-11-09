/**
 * Tests de integración E2E para las rutas y vistas expandidas (Módulos 19 al 22).
 * @module tests/App.expansion.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { healthService } from './services/healthService';
import { imagesService } from './services/imagesService';
import { tablesService } from './services/tablesService';
import { pdfsService } from './services/pdfsService';
import { formsService } from './services/formsService';
import { auditService } from './services/auditService';
import { storageService } from './services/storageService';

describe('App Expansion Navigation & E2E (Módulos 19 - 22)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    storageService.saveSession({
      token: 'mock-admin-token',
      user: { id: 'admin-1', username: 'admin', role: 'ADMIN' },
    });

    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-08T20:00:00Z',
    });
    vi.spyOn(imagesService, 'fetchRemoteImages').mockResolvedValue([]);
    vi.spyOn(tablesService, 'fetchRemoteTables').mockResolvedValue([]);
    vi.spyOn(pdfsService, 'fetchRemotePdfs').mockResolvedValue([]);
    vi.spyOn(formsService, 'listForms').mockResolvedValue([]);
    vi.spyOn(auditService, 'fetchAuditLogs').mockResolvedValue({ logs: [], total: 0, page: 1, limit: 25, totalPages: 1 });
  });

  it('navega fluidamente hacia la vista de Documentos PDF desde el Sidebar', async () => {
    await act(async () => {
      render(<App />);
    });

    const pdfNavBtn = screen.getByText('Documentos PDF');
    expect(pdfNavBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(pdfNavBtn);
    });

    expect(screen.getByTestId('pdfs-catalog-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subir PDF/i })).toBeInTheDocument();
  });

  it('navega hacia el Estudio de Formularios Dinámicos desde el Sidebar', async () => {
    await act(async () => {
      render(<App />);
    });

    const formsNavBtn = screen.getByText('Formularios');
    expect(formsNavBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(formsNavBtn);
    });

    expect(screen.getByText('Estudio de Formularios & Tablas Abiertas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo Formulario/i })).toBeInTheDocument();
  });

  it('navega hacia el Registro de Auditoría desde el Sidebar para el rol ADMIN', async () => {
    await act(async () => {
      render(<App />);
    });

    const auditNavBtn = screen.getByText('Registro de Auditoría');
    expect(auditNavBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(auditNavBtn);
    });

    expect(screen.getByText('Historial de Auditoría & Trazabilidad')).toBeInTheDocument();
  });
});
