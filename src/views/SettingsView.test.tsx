import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import { ToastProvider } from '../context/ToastContext';
import { storageService, DEFAULT_CONFIG } from '../services/storageService';
import { healthService } from '../services/healthService';

const renderSettingsView = (props: {
  onBackToGallery?: () => void;
  onConfigSaved?: () => void;
  onItemImported?: () => void;
} = {}) => {
  return render(
    <ToastProvider>
      <SettingsView
        onBackToGallery={props.onBackToGallery || vi.fn()}
        onConfigSaved={props.onConfigSaved}
        onItemImported={props.onItemImported}
      />
    </ToastProvider>
  );
};

describe('SettingsView Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders title, back button, connection card and import card', () => {
    renderSettingsView();

    expect(screen.getByRole('heading', { name: /Configuración & Herramientas API/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver a Galería/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Conexión con Monolith Backend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Importación por ShortCode/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/URL Base de Monolith Backend/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/X-API-Key de Sistema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ShortCode \(Código Corto\)/i)).toBeInTheDocument();
  });

  it('allows saving new API configuration and triggers onConfigSaved', async () => {
    const onConfigSaved = vi.fn();
    renderSettingsView({ onConfigSaved });

    const baseUrlInput = screen.getByLabelText(/URL Base de Monolith Backend/i);
    const apiKeyInput = screen.getByLabelText(/X-API-Key de Sistema/i);
    const saveBtn = screen.getByRole('button', { name: /Guardar Configuración/i });

    await act(async () => {
      fireEvent.change(baseUrlInput, { target: { value: 'https://api.dokploy.example.com' } });
      fireEvent.change(apiKeyInput, { target: { value: 'custom_key_xyz' } });
      fireEvent.click(saveBtn);
    });

    const saved = storageService.getConfig();
    expect(saved.baseUrl).toBe('https://api.dokploy.example.com');
    expect(saved.apiKey).toBe('custom_key_xyz');
    expect(onConfigSaved).toHaveBeenCalledTimes(1);
  });

  it('resets form inputs to DEFAULT_CONFIG when clicking "Valores por Defecto"', async () => {
    renderSettingsView();

    const baseUrlInput = screen.getByLabelText(/URL Base de Monolith Backend/i) as HTMLInputElement;
    const apiKeyInput = screen.getByLabelText(/X-API-Key de Sistema/i) as HTMLInputElement;
    const resetBtn = screen.getByRole('button', { name: /Valores por Defecto/i });

    await act(async () => {
      fireEvent.change(baseUrlInput, { target: { value: 'https://changed-temporarily.com' } });
      fireEvent.click(resetBtn);
    });

    expect(baseUrlInput.value).toBe(DEFAULT_CONFIG.baseUrl);
    expect(apiKeyInput.value).toBe(DEFAULT_CONFIG.apiKey);
  });

  it('tests connection and displays latency when clicking "Probar Conexión"', async () => {
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      status: 'ok',
      db: 'up',
      storage: 'writable',
      timestamp: '2026-10-29T18:00:00Z',
      latencyMs: 42,
    });

    renderSettingsView();

    const testBtn = screen.getByRole('button', { name: /Probar Conexión/i });

    await act(async () => {
      fireEvent.click(testBtn);
    });

    expect(screen.getByText(/En línea \(42 ms\) · DB: up/i)).toBeInTheDocument();
  });

  it('imports an image by shortCode and calls onItemImported', async () => {
    const onItemImported = vi.fn();
    renderSettingsView({ onItemImported });

    const codeInput = screen.getByLabelText(/ShortCode \(Código Corto\)/i);
    const nameInput = screen.getByLabelText(/Nombre personalizado \(opcional\)/i);
    const importBtn = screen.getByRole('button', { name: /Importar al Catálogo/i });

    await act(async () => {
      fireEvent.change(codeInput, { target: { value: 'imgShort123' } });
      fireEvent.change(nameInput, { target: { value: 'foto-paisaje.png' } });
      fireEvent.click(importBtn);
    });

    const images = storageService.getImages();
    const imported = images.find((i) => i.shortCode === 'imgShort123');
    expect(imported).toBeDefined();
    expect(imported?.originalName).toBe('foto-paisaje.png');
    expect(imported?.url).toContain('/i/imgShort123');
    expect(onItemImported).toHaveBeenCalledTimes(1);
  });

  it('imports a table by shortCode and calls onItemImported', async () => {
    const onItemImported = vi.fn();
    renderSettingsView({ onItemImported });

    const tableTypeBtn = screen.getByRole('button', { name: /Tabla \/ CSV/i });
    await act(async () => {
      fireEvent.click(tableTypeBtn);
    });

    const codeInput = screen.getByLabelText(/ShortCode \(Código Corto\)/i);
    const nameInput = screen.getByLabelText(/Nombre personalizado \(opcional\)/i);
    const importBtn = screen.getByRole('button', { name: /Importar al Catálogo/i });

    await act(async () => {
      fireEvent.change(codeInput, { target: { value: 'tblShort456' } });
      fireEvent.change(nameInput, { target: { value: 'dataset-analisis.csv' } });
      fireEvent.click(importBtn);
    });

    const tables = storageService.getTables();
    const imported = tables.find((t) => t.shortCode === 'tblShort456');
    expect(imported).toBeDefined();
    expect(imported?.tableName).toBe('dataset-analisis.csv');
    expect(imported?.url).toContain('/t/tblShort456');
    expect(onItemImported).toHaveBeenCalledTimes(1);
  });

  it('triggers onBackToGallery when clicking "Volver a Galería"', async () => {
    const onBack = vi.fn();
    renderSettingsView({ onBackToGallery: onBack });

    const backBtn = screen.getByRole('button', { name: /Volver a Galería/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
