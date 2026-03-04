import { describe, it, expect } from 'vitest';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ICONS } from '../src/data/statusConfig.js';

describe('statusConfig', () => {
  const ALL_STATES = [
    'responding', 'scheduling', 'qualifying', 'sending',
    'thinking', 'working', 'waiting', 'overloaded', 'idle', 'paused',
  ];

  it('STATUS_COLORS has a color for every known state', () => {
    ALL_STATES.forEach(state => {
      expect(STATUS_COLORS[state]).toBeDefined();
      expect(STATUS_COLORS[state]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('STATUS_LABELS has a label for every known state', () => {
    ALL_STATES.forEach(state => {
      expect(STATUS_LABELS[state]).toBeDefined();
      expect(typeof STATUS_LABELS[state]).toBe('string');
      expect(STATUS_LABELS[state].length).toBeGreaterThan(0);
    });
  });

  it('STATUS_ICONS has an icon for every known state', () => {
    ALL_STATES.forEach(state => {
      expect(STATUS_ICONS[state]).toBeDefined();
    });
  });
});
