import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordModal } from './ChangePasswordModal';
import { authService } from '../../services/authService';
import { ToastProvider } from '../../context/ToastContext';
import { AuthProvider } from '../../context/AuthContext';

const renderModal = (props: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  return render(
    <AuthProvider>
      <ToastProvider>
        <ChangePasswordModal {...props} />
      </ToastProvider>
    </AuthProvider>
  );
};

describe('ChangePasswordModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false, onClose: vi.fn() });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal dialog with inputs when isOpen is true', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cambiar Contraseña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña Actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nueva Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar Nueva Contraseña/i)).toBeInTheDocument();
  });

  it('shows error if current password is missing', async () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    expect(await screen.findByText(/Por favor introduce tu contraseña actual/i)).toBeInTheDocument();
  });

  it('validates minimum length of 6 characters for new password', async () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    fireEvent.change(screen.getByLabelText(/Contraseña Actual/i), { target: { value: 'oldPass123' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/al menos 6 caracteres/i);
  });

  it('validates that new password matches confirmation', async () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    fireEvent.change(screen.getByLabelText(/Contraseña Actual/i), { target: { value: 'oldPass123' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), { target: { value: 'newSecretPass1' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/i), { target: { value: 'differentSecretPass2' } });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
  });

  it('validates that new password cannot be identical to current password', async () => {
    renderModal({ isOpen: true, onClose: vi.fn() });

    fireEvent.change(screen.getByLabelText(/Contraseña Actual/i), { target: { value: 'samePassword123' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), { target: { value: 'samePassword123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/i), { target: { value: 'samePassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    expect(await screen.findByText(/debe ser diferente a la contraseña actual/i)).toBeInTheDocument();
  });

  it('submits successfully and calls changePassword and onClose', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    const changeSpy = vi.spyOn(authService, 'changePassword').mockResolvedValue({
      message: 'Contraseña actualizada con éxito',
    });

    renderModal({ isOpen: true, onClose, onSuccess });

    fireEvent.change(screen.getByLabelText(/Contraseña Actual/i), { target: { value: 'currentPass123' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), { target: { value: 'brandNewSecret999' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/i), { target: { value: 'brandNewSecret999' } });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith({
        currentPassword: 'currentPass123',
        newPassword: 'brandNewSecret999',
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays server error message when changePassword rejects', async () => {
    vi.spyOn(authService, 'changePassword').mockRejectedValue({
      detail: 'La contraseña actual no es correcta',
    });

    renderModal({ isOpen: true, onClose: vi.fn() });

    fireEvent.change(screen.getByLabelText(/Contraseña Actual/i), { target: { value: 'wrongPass' } });
    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), { target: { value: 'newGoodPass123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/i), { target: { value: 'newGoodPass123' } });

    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));

    expect(await screen.findByText(/La contraseña actual no es correcta/i)).toBeInTheDocument();
  });
});
