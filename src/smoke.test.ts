import { describe, it, expect } from 'vitest';

describe('Smoke Test Environment', () => {
  it('should evaluate basic truthiness correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('has access to window and DOM in jsdom', () => {
    expect(window).toBeDefined();
    const div = document.createElement('div');
    div.textContent = 'Gestor Multimedia';
    expect(div.textContent).toBe('Gestor Multimedia');
  });
});
