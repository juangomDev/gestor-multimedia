import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FormCard } from './FormCard';
import type { FormDefinition } from '../../types/forms';

describe('FormCard', () => {
  const mockForm: FormDefinition = {
    id: 'form-123',
    slug: 'solicitud-tramite',
    title: 'Solicitud de Trámite Municipal',
    description: 'Formulario oficial de recepción de solicitudes.',
    entriesCount: 5,
    entryFieldsSchema: [
      { name: 'nombre', label: 'Nombre', type: 'string' },
      { name: 'email', label: 'Email', type: 'email' },
    ],
    resolutionFieldsSchema: [
      { name: 'dictamen', label: 'Dictamen', type: 'string' },
    ],
    allowedResolutionStates: ['VALID', 'INVALID'],
    createdAt: '2026-03-01T10:00:00Z',
  };

  it('debe renderizar título, slug, descripción y contadores de campos', () => {
    render(<FormCard form={mockForm} />);

    expect(screen.getByText('Solicitud de Trámite Municipal')).toBeInTheDocument();
    expect(screen.getByText('/solicitud-tramite')).toBeInTheDocument();
    expect(screen.getByText('Formulario oficial de recepción de solicitudes.')).toBeInTheDocument();
    expect(screen.getByText('5 entradas')).toBeInTheDocument();
    expect(screen.getByText('2 inputs')).toBeInTheDocument();
    expect(screen.getByText('1 resolución')).toBeInTheDocument();
  });

  it('debe invocar onSelect al hacer click en la tarjeta o botón Bandeja', () => {
    const handleSelect = vi.fn();
    render(<FormCard form={mockForm} onSelect={handleSelect} />);

    fireEvent.click(screen.getByText('Bandeja'));
    expect(handleSelect).toHaveBeenCalledWith(mockForm);
  });

  it('debe copiar el enlace público al portapapeles', async () => {
    const handleNotify = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<FormCard form={mockForm} onNotify={handleNotify} />);

    const copyBtn = screen.getByTitle('Copiar URL pública del formulario');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('/#/public/forms/solicitud-tramite')
    );
  });
});
