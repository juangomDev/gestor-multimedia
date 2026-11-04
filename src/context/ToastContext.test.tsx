import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from './ToastContext';
import { useToast } from './useToast';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Operación exitosa', 'success')}>Mostrar Exito</button>
      <button onClick={() => showToast('Error detectado', 'error')}>Mostrar Error</button>
    </div>
  );
};

describe('ToastContext', () => {
  it('throws error if useToast is used outside provider', () => {
    const BadComponent = () => {
      useToast();
      return null;
    };
    // Suppress console.error for expected React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useToast must be used within a ToastProvider');
    spy.mockRestore();
  });

  it('renders and dismisses toasts correctly', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn = screen.getByText('Mostrar Exito');
    await userEvent.click(btn);

    expect(screen.getByText('Operación exitosa')).toBeDefined();

    // Find close button and click it
    const closeBtn = screen.getByLabelText('Cerrar notificación');
    await userEvent.click(closeBtn);

    expect(screen.queryByText('Operación exitosa')).toBeNull();
  });
});
