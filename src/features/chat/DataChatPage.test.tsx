import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { chatService } from '../../services/chatService';
import { notificationsService } from '../../services/notificationsService';
import { storageService } from '../../services/storageService';
import { ApiError } from '../../services/http/apiError';
import { ShellContext, type ShellContextValue } from '../shell/shellContextDef';
import { DataChatPage } from './DataChatPage';
import type { FolderItem } from '../../types/media';

const FOLDERS_FIXTURE: FolderItem[] = [
  {
    id: 'fld-finanzas',
    name: 'Finanzas 2026',
    type: 'table',
    parentId: null,
    myPermission: 'ADMIN',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'fld-legal',
    name: 'Normativa PDF',
    type: 'pdf',
    parentId: null,
    myPermission: 'EDIT',
    createdAt: '2026-11-01T00:00:00Z',
  },
];

function renderDataChat(openShortCodePreview = vi.fn()) {
  const user = { id: 'u-admin', username: 'admin', role: 'ADMIN' as const, isActive: true };
  storageService.saveSession({ token: 'jwt-admin', user });
  vi.spyOn(authService, 'getMe').mockResolvedValue({ user });
  vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);

  const shellValue: ShellContextValue = {
    activeFolder: null,
    allFolders: FOLDERS_FIXTURE,
    isCommandPaletteOpen: false,
    openCommandPalette: vi.fn(),
    closeCommandPalette: vi.fn(),
    openChangePassword: vi.fn(),
    triggerContextualUpload: vi.fn(),
    registerUploadHandler: () => () => undefined,
    openShortCodePreview,
    closeShortCodePreview: vi.fn(),
    activePreview: null,
  };

  const queryClient = createAppQueryClient();

  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/chat']}>
        <ShellContext.Provider value={shellValue}>
          <Routes>
            <Route path="/chat" element={<DataChatPage />} />
            <Route
              path="/tables/:shortCode"
              element={<div data-testid="table-route-target">Data Studio abierto</div>}
            />
          </Routes>
        </ShellContext.Provider>
      </MemoryRouter>
    </AppProviders>
  );
}

describe('DataChatPage, ChatMessageBubble (usedAi), Citas, Gráficos y PublicWidgetDrawer (Fase 6.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storageService.setApiBaseUrl('http://localhost:3000');
  });

  it('muestra sugerencias RBAC internas, insignia usedAi true/false, gráfico chartData y abre citas de Tabla y PDF en página exacta', async () => {
    const internalSuggSpy = vi
      .spyOn(chatService, 'getInternalSuggestions')
      .mockResolvedValue(['¿Cuál fue la facturación por región?']);
    const askSpy = vi
      .spyOn(chatService, 'askInternal')
      .mockResolvedValueOnce({
        answer: 'La región Norte lidera con 1.500 USD según el cierre Q1.',
        foundInSystem: true,
        usedAi: true,
        sources: [
          { tableId: 't1', tableName: 'ventas-q1.json', shortCode: 'tbl99' },
          { pdfId: 'p1', pdfName: 'manual-fiscal.pdf', shortCode: 'pdf09', pages: [4, 7] },
        ],
        chartData: {
          labels: ['Norte', 'Sur'],
          values: [1500, 900],
          percentages: [62.5, 37.5],
        },
      })
      .mockResolvedValueOnce({
        answer: 'Existen 2 datasets registrados en la carpeta Finanzas 2026.',
        foundInSystem: true,
        usedAi: false,
        sources: [],
        chartData: null,
      });

    const openPreviewSpy = vi.fn();
    renderDataChat(openPreviewSpy);

    // 1. Disparo desde chip de sugerencia (usedAi: true + chartData + citas)
    fireEvent.click(await screen.findByText(/¿Cuál fue la facturación por región\?/i));

    await waitFor(() => {
      expect(askSpy).toHaveBeenCalledWith('¿Cuál fue la facturación por región?', null, null);
    });

    expect(await screen.findByText('Generado con IA')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bar-chart')).toHaveTextContent('62.5%');

    // Cita PDF abre PdfViewerDialog en página exacta `pages[0] = 4`
    fireEvent.click(screen.getByTestId('chat-source-pdf09'));
    expect(openPreviewSpy).toHaveBeenCalledWith({
      type: 'pdf',
      shortCode: 'pdf09',
      page: 4,
    });

    // 2. Segunda consulta acotada a carpeta con usedAi: false
    fireEvent.click(screen.getByRole('radio', { name: /Carpeta específica/i }));
    fireEvent.change(screen.getByTestId('chat-scope-folder-select'), {
      target: { value: 'fld-finanzas' },
    });
    fireEvent.change(screen.getByTestId('chat-composer-input'), {
      target: { value: '¿Cuántos datasets hay?' },
    });
    fireEvent.click(screen.getByTestId('chat-send-btn'));

    await waitFor(() => {
      expect(internalSuggSpy).toHaveBeenCalledWith('fld-finanzas');
      expect(askSpy).toHaveBeenCalledWith('¿Cuántos datasets hay?', 'fld-finanzas', null);
    });
    expect(await screen.findByText('Respuesta directa del sistema')).toBeInTheDocument();

    // Cita Tabla navega a /tables/tbl99
    fireEvent.click(screen.getByTestId('chat-source-tbl99'));
    expect(await screen.findByTestId('table-route-target')).toBeInTheDocument();
  });

  it('prueba el PublicWidgetDrawer contra POST /api/v1/public/chat/ask con usedAi, maneja 429 y genera snippets HTML/React', async () => {
    vi.spyOn(chatService, 'getInternalSuggestions').mockResolvedValue([]);
    const askPublicSpy = vi
      .spyOn(chatService, 'askPublic')
      .mockResolvedValueOnce({
        answer: 'Horario institucional: lunes a viernes de 08:00 a 17:00.',
        foundInSystem: true,
        usedAi: false,
        sources: [],
        chartData: null,
      })
      .mockRejectedValueOnce(new ApiError(429, 'RATE_LIMIT', 'Too many requests'));

    renderDataChat();
    fireEvent.click(await screen.findByTestId('open-public-widget-btn'));

    const publicInput = await screen.findByTestId('public-widget-input');
    fireEvent.change(publicInput, { target: { value: '¿Cuál es el horario?' } });
    fireEvent.click(screen.getByTestId('public-widget-send-btn'));

    await waitFor(() => {
      expect(askPublicSpy).toHaveBeenCalledWith('¿Cuál es el horario?', null);
    });
    expect(await screen.findByText('Respuesta directa del sistema')).toBeInTheDocument();

    // Segundo envío devuelve 429 rate-limit
    fireEvent.change(publicInput, { target: { value: 'Otra consulta' } });
    fireEvent.click(screen.getByTestId('public-widget-send-btn'));
    expect(await screen.findByTestId('public-widget-error')).toHaveTextContent(/429/i);

    // Pestaña Incrustar HTML / React
    const embedTab = screen.getByRole('tab', { name: /Incrustar HTML \/ React/i });
    fireEvent.mouseDown(embedTab);
    fireEvent.click(embedTab);

    const snippetEl = await screen.findByTestId('public-widget-snippet');
    expect(snippetEl).toHaveTextContent('http://localhost:3000/api/v1/public/chat/ask');
    expect(snippetEl).toHaveTextContent('usedAi');

    fireEvent.click(screen.getByRole('button', { name: 'React (TSX)' }));
    expect(screen.getByTestId('public-widget-snippet')).toHaveTextContent(
      'export function PublicDataChatWidget'
    );
  });
});
