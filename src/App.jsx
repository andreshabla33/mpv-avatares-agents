import { useState, useEffect, useRef, useCallback } from 'react'
import PixelOffice from './components/PixelOffice'
import StatusBar from './components/StatusBar'
import ActivityFeed from './components/ActivityFeed'
import AgentDetail from './components/AgentDetail'
import { useAgentStates } from './hooks/useAgentStates'
import { useSounds } from './hooks/useSounds'

function App() {
  const { agents, states, extras, kpis, activityLog, apiAvailable } = useAgentStates(5000)
  const { playSound, toggleSounds, isEnabled } = useSounds()
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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-0">
      <header className="py-2 text-center relative">
        <h1 className="text-lg font-mono font-bold text-[#4ecdc4] tracking-widest uppercase">
          ◈ Monica CRM — AI Office ◈
        </h1>
        <div className="flex items-center justify-center gap-3 mt-1">
          <p className="text-[10px] font-mono text-[#4a4a6a]">
            RETRO OFFICE SIMULATOR v3.0 — {apiAvailable ? 'LIVE DATA' : 'DEMO MODE'}
          </p>
          <button
            onClick={handleToggleSound}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#2a2a4e] hover:border-[#4a4a6a] transition-colors"
            style={{ color: soundOn ? '#4ecdc4' : '#3a3a5a' }}
          >
            {soundOn ? '♪ ON' : '♪ OFF'}
          </button>
        </div>
      </header>
      <div className="flex gap-2 items-start">
        <PixelOffice
          agents={agents}
          agentStates={states}
          extras={extras}
          kpis={kpis}
          onAgentClick={handleAgentClick}
        />
        <ActivityFeed log={activityLog} kpis={kpis} apiAvailable={apiAvailable} />
      </div>
      <StatusBar agents={agents} agentStates={states} extras={extras} apiAvailable={apiAvailable} kpis={kpis} />

      {/* Focus Mode Modal */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          state={states[selectedAgent.id] || 'idle'}
          extra={extras[selectedAgent.id] || {}}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}

export default App
