import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { healthService } from '../services/healthService';
import { formatUptime } from '../utils/formatters';

const renderView = () =>
  render(
    <AuthProvider>
      <ToastProvider>
        <SettingsView onBackToGallery={vi.fn()} />
      </ToastProvider>
    </AuthProvider>
  );

describe('SettingsView — Módulo 17 (Scalar, OpenAPI & Diagnóstico de Salud)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    storageService.saveConfig({ baseUrl: 'https://api.example.com' });
  });

  it('renders health diagnostics tiles for PostgreSQL, Storage, latency and uptime', async () => {
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      uptime: 7260,
      timestamp: '2026-11-05T12:00:00Z',
      latencyMs: 37,
    });

    await act(async () => {
      renderView();
    });

    expect(
      screen.getByRole('heading', { name: /Diagnóstico de Salud en Tiempo Real/i })
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('diag-database')).getByText('Conectado')).toBeInTheDocument();
    expect(within(screen.getByTestId('diag-storage')).getByText('Escribible')).toBeInTheDocument();
    expect(within(screen.getByTestId('diag-latency')).getByText('37 ms')).toBeInTheDocument();
    expect(within(screen.getByTestId('diag-uptime')).getByText('2h 1m')).toBeInTheDocument();
  });

  it('shows degraded badges and refreshes on demand', async () => {
    const spy = vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'degraded',
      db: 'down',
      storage: 'unwritable',
      timestamp: '2026-11-05T12:00:00Z',
      latencyMs: 0,
    });

    await act(async () => {
      renderView();
    });

    expect(within(screen.getByTestId('diag-database')).getByText('Caído')).toBeInTheDocument();
    expect(within(screen.getByTestId('diag-storage')).getByText('Sin escritura')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Actualizar Diagnóstico/i }));
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('exposes Scalar docs link, integrated iframe viewer and OpenAPI spec inspector', async () => {
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-11-05T12:00:00Z',
      latencyMs: 10,
    });
    vi.spyOn(healthService, 'fetchOpenApiSpec').mockResolvedValue({
      openapi: '3.1.0',
      info: { title: 'Monolith API', version: '1.2.0' },
      paths: { '/health': {}, '/docs': {} },
    });

    await act(async () => {
      renderView();
    });

    const link = screen.getByRole('link', { name: /Abrir \/docs en nueva pestaña/i });
    expect(link).toHaveAttribute('href', 'https://api.example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Visor Integrado/i }));
    });
    expect(screen.getByTitle(/Documentación Scalar/i)).toHaveAttribute(
      'src',
      'https://api.example.com/docs'
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cerrar modal/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Inspeccionar openapi.json/i }));
    });
    expect(screen.getByText('OpenAPI 3.1.0')).toBeInTheDocument();
    expect(screen.getByText('Monolith API v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('2 rutas')).toBeInTheDocument();
    expect(screen.getByLabelText(/JSON de la especificación OpenAPI/i).textContent).toContain(
      '"openapi": "3.1.0"'
    );
  });

  it('formats uptime compactly', () => {
    expect(formatUptime(35)).toBe('35s');
    expect(formatUptime(125)).toBe('2m 5s');
    expect(formatUptime(90000)).toBe('1d 1h');
  });
});
