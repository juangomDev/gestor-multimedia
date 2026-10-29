import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from './clipboard';

describe('clipboard utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for empty text', async () => {
    const res = await copyToClipboard('');
    expect(res).toBe(false);
  });

  it('copies using navigator.clipboard when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
    // Set isSecureContext
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    const result = await copyToClipboard('https://api.dokploy.com/i/test12345');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('https://api.dokploy.com/i/test12345');
  });

  it('uses document.execCommand fallback if navigator.clipboard fails', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('texto de prueba');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });
});
