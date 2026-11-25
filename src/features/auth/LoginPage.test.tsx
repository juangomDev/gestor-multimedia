import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../../App';
import { AppRoutes } from '../../router';
import { createAppQueryClient } from '../../queries/queryClient';
import { authService } from '../../services/authService';
import { healthService } from '../../services/healthService';
import { foldersService } from '../../services/foldersService';
import { notificationsService } from '../../services/notificationsService';
import * as notificationsStream from '../../services/notificationsStream';
import { storageService } from '../../services/storageService';
import {
  getRememberMePreference,
  saveRememberedUsername,
} from '../../services/auth/sessionKeepAliveStorage';
import { ApiError } from '../../services/apiClient';

function renderAtLogin() {
  const queryClient = createAppQueryClient();
  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>
  );
}

describe('LoginPage v2 (Fase 3.2 — Auth real, /health y Popover Servidor API)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storageService.resetCache();
    vi.restoreAllMocks();

    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-19T00:00:00Z',
      latencyMs: 18,
    });
    vi.spyOn(foldersService, 'fetchFolderTree').mockResolvedValue([]);
    vi.spyOn(notificationsService, 'fetchUnreadCount').mockResolvedValue(0);
    vi.spyOn(notificationsStream, 'connectNotificationsStream').mockReturnValue({
      disconnect: vi.fn(),
    });
  });

  it('muestra indicador /health en vivo y permite iniciar sesión real hacia /', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue({
      token: 'jwt-real-token',
      user: { id: 'u-1', username: 'ana', role: 'MANAGER', isActive: true },
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      user: { id: 'u-1', username: 'ana', role: 'MANAGER', isActive: true },
    });

    renderAtLogin();

    expect(await screen.findByText(/API en línea · 18 ms/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Usuario/i), { target: { value: 'ana' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Secreta123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar al espacio/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({ username: 'ana', password: 'Secreta123!' });
    });
    expect(await screen.findByTestId('explorer-page')).toBeInTheDocument();
  });

  it('maneja explícitamente errores 401 y 429 RATE_LIMIT_EXCEEDED', async () => {
    vi.spyOn(authService, 'login')
      .mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Contraseña incorrecta'))
      .mockRejectedValueOnce(new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Too many attempts'));

    renderAtLogin();

    fireEvent.change(screen.getByLabelText(/^Usuario/i), { target: { value: 'ana' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar al espacio/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Contraseña incorrecta/i);

    fireEvent.click(screen.getByRole('button', { name: /Entrar al espacio/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/límite temporal excedido/i);
  });

  it('permite cambiar apiBaseUrl mediante el Popover Radix "Cambiar servidor API"', async () => {
    const checkHealthSpy = vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-19T00:00:00Z',
      latencyMs: 24,
    });

    renderAtLogin();

    fireEvent.click(screen.getByRole('button', { name: /Cambiar servidor API/i }));

    const urlInput = await screen.findByLabelText(/URL base del backend/i);
    fireEvent.change(urlInput, { target: { value: 'https://mi-boveda.sslip.io/' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y probar/i }));

    await waitFor(() => {
      expect(storageService.getApiBaseUrl()).toBe('https://mi-boveda.sslip.io');
    });
    expect(checkHealthSpy).toHaveBeenCalled();
  });

  it('rechaza URLs inválidas en ServerUrlPopover y purga QueryClient al cambiar de servidor', async () => {
    const queryClient = createAppQueryClient();
    queryClient.setQueryData(['folders', 'tree'], [{ id: 'stale-folder' }]);

    render(
      <AppProviders queryClient={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cambiar servidor API/i }));
    const urlInput = await screen.findByLabelText(/URL base del backend/i);

    fireEvent.change(urlInput, { target: { value: 'http://invalida con espacios' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y probar/i }));
    expect(await screen.findByText(/Introduce una URL HTTP o HTTPS válida/i)).toBeInTheDocument();
    expect(queryClient.getQueryData(['folders', 'tree'])).toBeDefined();

    fireEvent.change(urlInput, { target: { value: 'https://server-b.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y probar/i }));

    await waitFor(() => {
      expect(storageService.getApiBaseUrl()).toBe('https://server-b.example.com');
      expect(queryClient.getQueryData(['folders', 'tree'])).toBeUndefined();
    });
  });

  it('pre-rellena el último usuario recordado y permite alternar "Mantener sesión iniciada"', async () => {
    saveRememberedUsername('juan_editor', true);
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue({
      token: 'jwt-tab-only',
      user: { id: 'u-9', username: 'juan_editor', role: 'MANAGER', isActive: true },
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      user: { id: 'u-9', username: 'juan_editor', role: 'MANAGER', isActive: true },
    });

    renderAtLogin();

    const userInput = screen.getByLabelText(/^Usuario/i) as HTMLInputElement;
    expect(userInput.value).toBe('juan_editor');

    const rememberCheckbox = screen.getByTestId('remember-me-checkbox') as HTMLInputElement;
    expect(rememberCheckbox.checked).toBe(true);

    // Desmarcar "Mantener sesión iniciada" y enviar
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox.checked).toBe(false);

    fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: 'Clave123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar al espacio/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({ username: 'juan_editor', password: 'Clave123!' });
    });
    expect(getRememberMePreference()).toBe(false);
  });
});
