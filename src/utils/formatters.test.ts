import { describe, it, expect } from 'vitest';
import { formatBytes, formatDate, truncate, cleanBaseUrl, buildPublicAssetUrl } from './formatters';

describe('formatters utility', () => {
  describe('buildPublicAssetUrl', () => {
    it('constructs public capability URL without trailing slash issues', () => {
      expect(buildPublicAssetUrl('http://app.sslip.io/', 'i', 'abc1234XYZ')).toBe('http://app.sslip.io/i/abc1234XYZ');
      expect(buildPublicAssetUrl('http://app.sslip.io', 't', 'tab1234XYZ')).toBe('http://app.sslip.io/t/tab1234XYZ');
    });
  });
  describe('formatBytes', () => {
    it('returns "0 B" for 0, negative, or invalid values', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('formats bytes, kilobytes, and megabytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });
  });

  describe('truncate', () => {
    it('does not truncate text shorter than maxLength', () => {
      expect(truncate('hola', 10)).toBe('hola');
    });

    it('truncates text exceeding maxLength and appends ellipsis', () => {
      expect(truncate('un texto bastante largo', 8)).toBe('un texto...');
    });

    it('handles empty strings gracefully', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('cleanBaseUrl', () => {
    it('removes trailing slashes and trims whitespace', () => {
      expect(cleanBaseUrl('  http://localhost:3000/ ')).toBe('http://localhost:3000');
      expect(cleanBaseUrl('https://api.dokploy.com///')).toBe('https://api.dokploy.com');
      expect(cleanBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });
  });

  describe('formatDate', () => {
    it('returns "Fecha desconocida" for invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Fecha desconocida');
    });

    it('formats valid ISO date strings', () => {
      const res = formatDate('2026-10-28T15:30:00Z');
      expect(res).not.toBe('Fecha desconocida');
      expect(res).toContain('2026');
    });
  });
});
