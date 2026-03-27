import { useState, useEffect, useRef, useCallback } from 'react'
import PixelOffice from './office2d/PixelOffice'
import StatusBar from './components/StatusBar'
import ActivityFeed from './components/ActivityFeed'
import AgentDetail from './components/AgentDetail'
import { useAgentStates } from './hooks/useAgentStates'
import { useSounds } from './hooks/useSounds'

function App() {
  const { agents, states, extras, kpis, activityLog, apiAvailable, isStale } = useAgentStates(5000)
  const { playSound, toggleSounds, isEnabled: _isEnabled } = useSounds()
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const prevStatesRef = useRef({})

  // Play sounds on state transitions
  useEffect(() => {
    const prev = prevStatesRef.current;
    Object.keys(states).forEach(id => {
      const cur = states[id];
      const old = prev[id];
      if (old && old !== cur && cur !== 'idle') {
        playSound(cur);
      }
    });
    prevStatesRef.current = { ...states };
  }, [states, playSound]);

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent);
  }, []);

  const handleToggleSound = useCallback(() => {
    const newVal = toggleSounds();
    setSoundOn(newVal);
  }, [toggleSounds]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--pixel-bg)', color: 'var(--pixel-text)' }}>
      {/* Header - Pixel Style */}
      <header className="w-full flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-2 shrink-0" style={{ borderBottom: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)' }}>
        <div className="flex items-center gap-3">
          <h1 style={{ fontSize: '24px', color: 'var(--pixel-accent)', margin: 0, textShadow: 'var(--pixel-shadow)' }}>
            UAL Office Virtual Agent <span style={{ color: 'var(--pixel-text-dim)', fontSize: '18px' }}>|| AI CONTROL</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }} className="hidden sm:inline">NET:</span>
            <span style={{ 
              fontSize: '20px', 
              color: apiAvailable && !isStale ? 'var(--pixel-green)' : 'var(--pixel-danger-bg)',
              textShadow: 'var(--pixel-shadow)'
            }}>
              {isStale ? 'SYS_FAULT' : apiAvailable ? 'ONLINE' : 'DEMO'}
            </span>
          </div>

          <button
            onClick={handleToggleSound}
            style={{
              background: soundOn ? 'var(--pixel-active-bg)' : 'var(--pixel-btn-bg)',
              border: `2px solid ${soundOn ? 'var(--pixel-accent)' : 'var(--pixel-border)'}`,
              color: 'var(--pixel-text)',
              padding: '4px 10px',
              fontSize: '20px',
              cursor: 'pointer',
              boxShadow: 'var(--pixel-shadow)'
            }}
          >
            <span className="hidden sm:inline">{soundOn ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
            <span className="sm:hidden">{soundOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Canvas container */}
        <div className="flex-1 relative min-h-0 bg-black">
          <PixelOffice
            agents={agents}
            states={states}
            extras={extras}
            kpis={kpis}
            onAgentClick={handleAgentClick}
          />
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[320px] lg:flex-shrink-0 flex flex-col min-h-0" style={{ borderLeft: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)' }}>
          <ActivityFeed log={activityLog} kpis={kpis} apiAvailable={apiAvailable} isStale={isStale} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="w-full shrink-0" style={{ borderTop: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)' }}>
        <StatusBar agents={agents} agentStates={states} extras={extras} apiAvailable={apiAvailable} kpis={kpis} />
      </div>

      {/* Focus Mode Modal */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          state={states[selectedAgent.id] || 'idle'}
          extra={extras[selectedAgent.id] || {}}
          onClose={() => setSelectedAgent(null)}
          onStateChange={(agentId, newState) => {
            // Optimistic update — next API poll will confirm or revert
            setSelectedAgent(prev => prev ? { ...prev, hasRealData: newState !== 'paused' } : null);
          }}
        />
      )}
    </div>
  )
}

export default App
