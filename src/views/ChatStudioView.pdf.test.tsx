import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatStudioView } from './ChatStudioView';
import { chatService, type ChatResponse } from '../services/chatService';
import { ToastProvider } from '../context/ToastContext';

describe('ChatStudioView — PDF RAG Synergy (Módulo 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza fuentes mixtas con citas de páginas de PDF y permite abrir el visor en la página referenciada', async () => {
    const mockAnswer = {
      answer: 'Según el contrato marco, el plazo de entrega es de 30 días hábiles.',
      foundInSystem: true,
      sources: [
        {
          pdfId: 'pdf-99',
          pdfName: 'contrato_marco.pdf',
          shortCode: 'docpdf',
          title: 'Contrato Marco 2026',
          pages: [3, 4],
        },
      ],
      chartData: null,
    };

    vi.spyOn(chatService, 'getPublicSuggestions').mockResolvedValue([]);
    vi.spyOn(chatService, 'askInternal').mockResolvedValue(mockAnswer as unknown as ChatResponse);

    render(
      <ToastProvider>
        <ChatStudioView folders={[]} tables={[]} />
      </ToastProvider>
    );

    const input = screen.getByLabelText('Pregunta analítica');
    fireEvent.change(input, { target: { value: '¿Cuál es el plazo de entrega?' } });
    fireEvent.submit(screen.getByRole('button', { name: /Consultar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Según el contrato marco/)).toBeInTheDocument();
      expect(screen.getByText('Contrato Marco 2026')).toBeInTheDocument();
      expect(screen.getByText('/p/docpdf')).toBeInTheDocument();
      expect(screen.getByText('Págs. 3, 4')).toBeInTheDocument();
    });

    // Abrir PDF en la página referenciada
    const openBtn = screen.getByRole('button', { name: /Pág. 3/i });
    fireEvent.click(openBtn);

    // Modal de visor abierto en la página 3 (pestaña texto extraído)
    expect(screen.getByText(/Documento PDF —/i)).toBeInTheDocument();
  });
});
