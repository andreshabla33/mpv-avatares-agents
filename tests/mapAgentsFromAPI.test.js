import { describe, it, expect } from 'vitest';
import { mapAgentsFromAPI } from '../src/data/agents.js';

describe('mapAgentsFromAPI', () => {
  it('maps active agents to desk positions', () => {
    const apiAgents = [
      { id: 'agent-1', name: 'Test Agent', active_channels: 2, role: 'Closer', llm: 'gpt-4o', empresa: 'TestCo' },
    ];
    const result = mapAgentsFromAPI(apiAgents);
    expect(result).toHaveLength(1);
    expect(result[0].hasRealData).toBe(true);
    expect(result[0].deskX).toBeDefined();
    expect(result[0].deskY).toBeDefined();
  });

  it('maps inactive agents (active_channels=0) to OFF positions', () => {
    const apiAgents = [
      { id: 'agent-2', name: 'Off Agent', active_channels: 0, role: 'PM' },
    ];
    const result = mapAgentsFromAPI(apiAgents);
    expect(result).toHaveLength(1);
    expect(result[0].hasRealData).toBe(false);
    // OFF positions start at x=770
    expect(result[0].deskX).toBeGreaterThanOrEqual(770);
  });

  it('handles missing active_channels as inactive', () => {
    const apiAgents = [
      { id: 'agent-3', name: 'No Channels' },
    ];
    const result = mapAgentsFromAPI(apiAgents);
    expect(result[0].hasRealData).toBe(false);
  });

  it('assigns unique colors to agents', () => {
    const apiAgents = [
      { id: 'agent-1', name: 'A', active_channels: 1 },
      { id: 'agent-2', name: 'B', active_channels: 1 },
      { id: 'agent-3', name: 'C', active_channels: 0 },
    ];
    const result = mapAgentsFromAPI(apiAgents);
    const colors = result.map(r => r.color);
    expect(new Set(colors).size).toBe(3);
  });

  it('preserves agent ID and name', () => {
    const apiAgents = [
      { id: 'agent-99', name: 'Monica', active_channels: 3, role: 'Cerrador', empresa: 'URPE' },
    ];
    const result = mapAgentsFromAPI(apiAgents);
    expect(result[0].id).toBe('agent-99');
    expect(result[0].name).toBe('Monica');
    expect(result[0].role).toBe('Cerrador');
    expect(result[0].empresa).toBe('URPE');
  });

  it('handles empty array', () => {
    expect(mapAgentsFromAPI([])).toEqual([]);
  });

  it('assigns different desk positions to multiple active agents', () => {
    const apiAgents = Array.from({ length: 5 }, (_, i) => ({
      id: `agent-${i}`, name: `Agent ${i}`, active_channels: 1,
    }));
    const result = mapAgentsFromAPI(apiAgents);
    const positions = result.map(r => `${r.deskX},${r.deskY}`);
    expect(new Set(positions).size).toBe(5);
  });
});
