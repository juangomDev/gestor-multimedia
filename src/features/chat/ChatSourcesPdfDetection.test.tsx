import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../../App';
import { createAppQueryClient } from '../../queries/queryClient';
import { queryKeys } from '../../queries/queryKeys';
import { ShellContext, type ShellContextValue } from '../shell/shellContextDef';
import { ChatSourcesList } from './ChatSourcesList';
import { isPdfSource } from './chatHelpers';
import type { ChatSource } from '../../types/chat';

function buildShell(openShortCodePreview = vi.fn()): ShellContextValue {
  return {
    activeFolder: null,
    allFolders: [],
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
}

describe('ChatSourcesList y isPdfSource — Detección de citas PDF en respuestas RAG', () => {
  it('detecta PDFs cuando el backend usa tableName terminando en .pdf o atributo type=pdf', () => {
    expect(
      isPdfSource({
        tableId: 'e155a472',
        tableName: 'Listado de Preguntas Frecuentes.pdf',
        shortCode: '48H2jSQomz',
        title: 'Listado de Preguntas Frecuentes',
      })
    ).toBe(true);

    expect(
      isPdfSource({
        type: 'PDF',
        shortCode: 'doc01',
        title: 'Reglamento',
      })
    ).toBe(true);

    expect(
      isPdfSource({
        tableId: 't-1',
        tableName: 'ventas.json',
        shortCode: 'tbl01',
      })
    ).toBe(false);
  });

  it('reconoce citas PDF sin extensión .pdf cruzando con la caché de TanStack Query y abre PdfViewerDialog', () => {
    const queryClient = createAppQueryClient();
    queryClient.setQueryData(queryKeys.pdfs.list({ page: 1, limit: 50 }), {
      items: [
        {
          id: 'e155a472',
          shortCode: '48H2jSQomz',
          originalName: 'Listado de Preguntas Frecuentes.pdf',
          sizeBytes: 23654,
          pageCount: 2,
          url: 'http://localhost:3000/p/48H2jSQomz',
          createdAt: '2026-11-19T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });

    const openPreviewSpy = vi.fn();
    const sources: ChatSource[] = [
      {
        tableId: 'e155a472',
        tableName: 'Listado de Preguntas Frecuentes',
        shortCode: '48H2jSQomz',
        title: 'Listado de Preguntas Frecuentes',
      },
    ];

    render(
      <AppProviders queryClient={queryClient}>
        <MemoryRouter>
          <ShellContext.Provider value={buildShell(openPreviewSpy)}>
            <ChatSourcesList sources={sources} />
          </ShellContext.Provider>
        </MemoryRouter>
      </AppProviders>
    );

    const chip = screen.getByTestId('chat-source-48H2jSQomz');
    expect(chip).toHaveTextContent('p/48H2jSQomz');
    expect(chip).not.toHaveTextContent('t/48H2jSQomz');

    fireEvent.click(chip);
    expect(openPreviewSpy).toHaveBeenCalledWith({
      type: 'pdf',
      shortCode: '48H2jSQomz',
      page: undefined,
    });
  });
});
