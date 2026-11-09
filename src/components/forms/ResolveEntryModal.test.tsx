import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResolveEntryModal } from './ResolveEntryModal';
import { formsService } from '../../services/formsService';
import type { FormDefinition, FormEntry } from '../../types/forms';

vi.mock('../../services/formsService', () => ({
  formsService: {
    resolveEntry: vi.fn(),
    dispatchEntry: vi.fn(),
  },
}));

describe('ResolveEntryModal', () => {
  const mockForm: FormDefinition = {
    id: 'form-1',
    slug: 'solicitud-ayuda',
    title: 'Solicitud de Ayuda',
    entryFieldsSchema: [
      { name: 'beneficiario', label: 'Nombre Beneficiario', type: 'string' },
      { name: 'monto', label: 'Monto Solicitado', type: 'number' },
    ],
    resolutionFieldsSchema: [
      { name: 'dictamen_oficial', label: 'Dictamen Oficial', type: 'string', required: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
    allowedResolutionStates: ['VALID', 'INVALID'],
    externalTargetUrl: 'https://webhook.org/dispatch',
    createdAt: '2026-03-01T00:00:00Z',
  };

  const newEntry: FormEntry = {
    id: 'entry-uuid-12345',
    formId: 'form-1',
    status: 'NEW',
    entryPayload: {
      beneficiario: 'Carlos Mendoza',
      monto: 1500,
    },
    createdAt: '2026-03-01T10:00:00Z',
  };

  const sealedEntry: FormEntry = {
    id: 'entry-uuid-sealed',
    formId: 'form-1',
    status: 'VALID',
    entryPayload: {
      beneficiario: 'María Gómez',
      monto: 2000,
    },
    resolutionPayload: {
      dictamen_oficial: 'Aprobado bajo resolución R-89',
      observaciones: 'Documentación completa verificada',
    },
    resolvedAt: '2026-03-02T15:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar los datos del usuario y permitir dictaminar una entrada NEW (Write-Once)', async () => {
    const handleResolved = vi.fn();
    const handleClose = vi.fn();
    const resolvedResult: FormEntry = {
      ...newEntry,
      status: 'VALID',
      resolutionPayload: { dictamen_oficial: 'Aprobado' },
      resolvedAt: '2026-03-01T12:00:00Z',
    };
    vi.mocked(formsService.resolveEntry).mockResolvedValueOnce(resolvedResult);

    render(
      <ResolveEntryModal
        isOpen={true}
        onClose={handleClose}
        entry={newEntry}
        form={mockForm}
        onResolved={handleResolved}
      />
    );

    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText(/Acción Inmutable \(Write-Once\)/i)).toBeInTheDocument();

    const inputDictamen = screen.getByLabelText(/Dictamen Oficial \*/i);
    fireEvent.change(inputDictamen, { target: { value: 'Aprobado' } });

    const submitBtn = screen.getByRole('button', { name: /Sellar Dictamen \(Write-Once\)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(formsService.resolveEntry).toHaveBeenCalledWith('entry-uuid-12345', {
        resolutionPayload: { dictamen_oficial: 'Aprobado' },
        status: 'VALID',
      });
      expect(handleResolved).toHaveBeenCalledWith(resolvedResult);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('debe mostrar el estado sellado inmutable y permitir despachar a webhook externo', async () => {
    vi.mocked(formsService.dispatchEntry).mockResolvedValueOnce({
      dispatched: true,
      targetUrl: 'https://webhook.org/dispatch',
      entryId: sealedEntry.id,
      dispatchedAt: '2026-03-02T16:00:00Z',
    });

    render(
      <ResolveEntryModal
        isOpen={true}
        onClose={vi.fn()}
        entry={sealedEntry}
        form={mockForm}
        onResolved={vi.fn()}
      />
    );

    expect(screen.getByText(/Registro Sellado/i)).toBeInTheDocument();
    expect(screen.getByText('Aprobado bajo resolución R-89')).toBeInTheDocument();
    expect(screen.getByText('Documentación completa verificada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sellar Dictamen/i })).not.toBeInTheDocument();

    const dispatchBtn = screen.getByRole('button', { name: /Despachar a Webhook/i });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(formsService.dispatchEntry).toHaveBeenCalledWith(sealedEntry.id);
    });
  });
});

