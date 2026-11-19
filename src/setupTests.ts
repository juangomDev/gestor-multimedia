import '@testing-library/jest-dom/vitest';
import { beforeEach, afterEach } from 'vitest';
import { storageService } from './services/storageService';

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

beforeEach(() => {
  storageService.resetCache();
});

afterEach(() => {
  storageService.resetCache();
});
