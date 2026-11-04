import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { authService } from '../../services/authService';

const renderSidebar = (props: any) => {
  return render(
    <AuthProvider>
      <ToastProvider>
        <Sidebar
          activeView="images"
          onViewChange={vi.fn()}
          onOpenUpload={vi.fn()}
          onSync={vi.fn()}
          imagesCount={10}
          tablesCount={5}
          {...props}
        />
      </ToastProvider>
    </AuthProvider>
  );
};

describe('Sidebar Component - Profile & Actions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders role badge and user account information', () => {
    vi.spyOn(authService, 'getSession').mockReturnValue({
      token: 'valid.token',
      user: { id: 'usr-1', username: 'juan_manager', role: 'MANAGER' },
    });

    renderSidebar({});

    expect(screen.getByText('juan_manager')).toBeInTheDocument();
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
  });

  it('triggers onOpenChangePassword when password button is clicked', () => {
    const onOpenChangePassword = vi.fn();
    renderSidebar({ onOpenChangePassword });

    const changePassBtn = screen.getByRole('button', { name: /Cambiar contraseña/i });
    fireEvent.click(changePassBtn);

    expect(onOpenChangePassword).toHaveBeenCalledTimes(1);
  });

  it('calls logout and changes view to login on logout click', async () => {
    const logoutSpy = vi.spyOn(authService, 'logout').mockResolvedValue();
    const onViewChange = vi.fn();

    renderSidebar({ onViewChange });

    const logoutBtn = screen.getByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(onViewChange).toHaveBeenCalledWith('login');
    });
  });
});
