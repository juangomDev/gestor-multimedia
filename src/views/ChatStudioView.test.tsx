import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { ChatStudioView } from './ChatStudioView';
import { chatService } from '../services/chatService';
import type { FolderItem, TableItem } from '../types/media';

const mockFolders: FolderItem[] = [
  {
    id: 'fld-pub-1',
    name: 'Estadísticas Públicas',
    type: 'table',
    isPrivate: false,
    itemCount: 2,
    createdAt: '2026-10-30T10:00:00Z',
  },
];

const mockTables: TableItem[] = [
  {
    id: 'tbl-1',
    shortCode: ' cen2026 ',
    tableName: 'censo_nacional.xlsx',
    rowCount: 120,
    sizeBytes: 24500,
    url: 'http://localhost:3000/t/cen2026',
    metadataCard: {
      title: 'Censo Demográfico 2026',
      unit: 'habitantes',
    },
    createdAt: '2026-10-30T10:00:00Z',
  },
];

describe('ChatStudioView Component — Module 16 (RAG Tabular, Sources, Charts & Public Widget)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads suggestion chips, submits analytical query, renders chartData and opens cited source in Data Studio', async () => {
    vi.spyOn(chatService, 'getPublicSuggestions').mockResolvedValue([
      '¿Cuál es la población por región?',
    ]);

    const askSpy = vi.spyOn(chatService, 'askInternal').mockResolvedValue({
      answer: 'La región Central concentra el 65% de la población registrada.',
      foundInSystem: true,
      sources: [
        {
          tableId: 'tbl-1',
          tableName: 'censo_nacional.xlsx',
          shortCode: 'cen2026',
          title: 'Censo Demográfico 2026',
        },
      ],
      chartData: {
        labels: ['Central', 'Norte'],
        values: [650000, 350000],
        percentages: [65, 35],
      },
    });

    const onOpenTableInStudio = vi.fn();

    render(
      <ToastProvider>
        <ChatStudioView
          folders={mockFolders}
          tables={mockTables}
          onOpenTableInStudio={onOpenTableInStudio}
        />
      </ToastProvider>
    );

    const chip = await screen.findByRole('button', {
      name: '¿Cuál es la población por región?',
    });
    expect(chip).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(chip);
    });

    expect(askSpy).toHaveBeenCalledWith(
      '¿Cuál es la población por región?',
      undefined,
      undefined
    );

    expect(
      await screen.findByText(/La región Central concentra el 65%/i)
    ).toBeInTheDocument();

    // Chart rendered with labels and percentages
    expect(screen.getByLabelText('Gráfico estadístico de datos')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();

    // Switch chart to Vertical mode
    const verticalBtn = screen.getByRole('button', { name: 'Vertical' });
    fireEvent.click(verticalBtn);
    expect(screen.getByText('65%')).toBeInTheDocument();

    // Cited source rendered with button to open in Data Studio
    expect(screen.getByText('Censo Demográfico 2026')).toBeInTheDocument();
    const openStudioBtn = screen.getByRole('button', { name: /Abrir Studio/i });
    fireEvent.click(openStudioBtn);
    expect(onOpenTableInStudio).toHaveBeenCalledTimes(1);
  });

  it('displays clear warning banner when foundInSystem is false and supports Public Widget Sandbox', async () => {
    vi.spyOn(chatService, 'getPublicSuggestions').mockResolvedValue([]);
    vi.spyOn(chatService, 'askInternal').mockResolvedValue({
      answer: 'No existen registros de exportaciones marcianas.',
      foundInSystem: false,
      sources: [],
      chartData: null,
    });

    const askPublicSpy = vi.spyOn(chatService, 'askPublic').mockResolvedValue({
      answer: 'Respuesta pública desde el widget embebido.',
      foundInSystem: true,
      sources: [],
      chartData: null,
    });

    render(
      <ToastProvider>
        <ChatStudioView folders={mockFolders} tables={mockTables} />
      </ToastProvider>
    );

    const input = screen.getByLabelText('Pregunta analítica');
    await act(async () => {
      fireEvent.change(input, { target: { value: '¿Exportaciones a Marte?' } });
    });

    const submitBtn = screen.getByRole('button', { name: /Consultar/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(
      await screen.findByText(/Dato no registrado en el sistema/i)
    ).toBeInTheDocument();

    // Open Public Widget Modal
    const widgetBtn = screen.getByRole('button', { name: /Widget Público/i });
    fireEvent.click(widgetBtn);

    expect(
      await screen.findByText(/Generador & Sandbox de Widget Público de Chat/i)
    ).toBeInTheDocument();

    const sandboxInput = screen.getByLabelText(
      'Pregunta de prueba para el widget público'
    );
    await act(async () => {
      fireEvent.change(sandboxInput, {
        target: { value: '¿Total en tablas públicas?' },
      });
    });

    const testLiveBtn = screen.getByRole('button', { name: /Probar en Vivo/i });
    await act(async () => {
      fireEvent.click(testLiveBtn);
    });

    await waitFor(() => {
      expect(askPublicSpy).toHaveBeenCalledWith(
        '¿Total en tablas públicas?',
        undefined,
        undefined
      );
    });
    expect(
      await screen.findByText('Respuesta pública desde el widget embebido.')
    ).toBeInTheDocument();
  });
});

