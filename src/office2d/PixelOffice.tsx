import { useCallback, useEffect, useRef, useState } from 'react';

import { BottomToolbar } from './components/BottomToolbar';
import { DebugView } from './components/DebugView';
import { ZoomControls } from './components/ZoomControls';
import { PULSE_ANIMATION_DURATION_SEC } from './constants';
import { useEditorActions } from './hooks/useEditorActions';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { useExtensionMessages } from './hooks/useExtensionMessages';
import { OfficeCanvas } from './office/components/OfficeCanvas';
import { ToolOverlay } from './office/components/ToolOverlay';
import { EditorState } from './office/editor/editorState';
import { EditorToolbar } from './office/editor/EditorToolbar';
import { OfficeState } from './office/engine/officeState';
import { isRotatable } from './office/layout/furnitureCatalog';
import { EditTool } from './office/types';
import { isBrowserRuntime } from './runtime';

const officeStateRef = { current: null as OfficeState | null };
const editorState = new EditorState();

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState();
  }
  return officeStateRef.current;
}

const actionBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '22px',
  background: 'var(--pixel-btn-bg)',
  color: 'var(--pixel-text-dim)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
};

const actionBarBtnDisabled: React.CSSProperties = {
  ...actionBarBtnStyle,
  opacity: 'var(--pixel-btn-disabled-opacity)',
  cursor: 'default',
};

function EditActionBar({
  editor,
  editorState: es,
}: {
  editor: ReturnType<typeof useEditorActions>;
  editorState: EditorState;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const undoDisabled = es.undoStack.length === 0;
  const redoDisabled = es.redoStack.length === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        padding: '4px 8px',
        boxShadow: 'var(--pixel-shadow)',
      }}
    >
      <button
        style={undoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={undoDisabled ? undefined : editor.handleUndo}
        title="Undo"
      >
        Undo
      </button>
      <button
        style={redoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={redoDisabled ? undefined : editor.handleRedo}
        title="Redo"
      >
        Redo
      </button>
      <button style={actionBarBtnStyle} onClick={editor.handleSave} title="Save layout">
        Save
      </button>
      {!showResetConfirm ? (
        <button
          style={actionBarBtnStyle}
          onClick={() => setShowResetConfirm(true)}
          title="Reset to last saved layout"
        >
          Reset
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '22px', color: 'var(--pixel-reset-text)' }}>Reset?</span>
          <button
            style={{ ...actionBarBtnStyle, background: 'var(--pixel-danger-bg)', color: '#fff' }}
            onClick={() => {
              setShowResetConfirm(false);
              editor.handleReset();
            }}
          >
            Yes
          </button>
          <button style={actionBarBtnStyle} onClick={() => setShowResetConfirm(false)}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

export default function PixelOffice({ agents: initialAgents, states: rawAgentStatuses, onAgentClick }: { agents: any[], states: any, onAgentClick?: (agent: any) => void }) {
  useEffect(() => {
    if (isBrowserRuntime) {
      import('./browserMock').then(({ dispatchMockMessages }) => {
        dispatchMockMessages();
        setTimeout(() => {
          const activeAgents = initialAgents.filter(a => a.hasRealData);
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: 'existingAgents',
              agents: activeAgents.map(a => parseInt(String(a.id).replace(/\D/g, ''), 10)).filter(id => !isNaN(id)),
              folderNames: Object.fromEntries(activeAgents.map(a => [parseInt(String(a.id).replace(/\D/g, ''), 10), a.name]).filter(([id]) => !isNaN(id as number)))
            }
          }));
        }, 500);
      });
    }
  }, []);

  const editor = useEditorActions(getOfficeState, editorState);
  const isEditDirty = useCallback(() => editor.isEditMode && editor.isDirty, [editor.isEditMode, editor.isDirty]);

  const {
    selectedAgent,
    agentTools,
    subagentTools,
    subagentCharacters,
    layoutReady,
    layoutWasReset,
    loadedAssets,
    workspaceFolders,
  } = useExtensionMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty);

  const prevAgentsRef = useRef<number[]>([]);
  useEffect(() => {
    if (!layoutReady) return;
    
    const activeAgents = initialAgents.filter(a => a.hasRealData);
    const currentIds = activeAgents.map(a => parseInt(String(a.id).replace(/\D/g, ''), 10)).filter(id => !isNaN(id));
    const prevIds = prevAgentsRef.current;
    
    if (prevIds.length === 0 && currentIds.length > 0) {
      const folderNames = Object.fromEntries(activeAgents.map(a => [parseInt(String(a.id).replace(/\D/g, ''), 10), a.name]).filter(([id]) => !isNaN(id as number)));
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'existingAgents', agents: currentIds, folderNames }
      }));
    } else {
      const toAdd = currentIds.filter(id => !prevIds.includes(id));
      const toRemove = prevIds.filter(id => !currentIds.includes(id));
      
      toAdd.forEach(id => {
        const agent = activeAgents.find(a => parseInt(String(a.id).replace(/\D/g, ''), 10) === id);
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'agentCreated', id, folderName: agent ? agent.name : '' }
        }));
      });
      
      toRemove.forEach(id => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'agentClosed', id }
        }));
      });
    }
    
    prevAgentsRef.current = currentIds;
  }, [initialAgents, layoutReady]);

  useEffect(() => {
    if (layoutReady) {
      Object.entries(rawAgentStatuses || {}).forEach(([idStr, status]) => {
        const id = parseInt(idStr.replace(/\D/g, ''), 10);
        if (!isNaN(id)) {
          if (status === 'responding') {
            window.dispatchEvent(new MessageEvent('message', { data: { type: 'agentToolStart', id, toolId: 'write', status: 'Writing response...' } }));
          } else if (status === 'thinking') {
            window.dispatchEvent(new MessageEvent('message', { data: { type: 'agentToolStart', id, toolId: 'read', status: 'Thinking...' } }));
          } else if (status === 'waiting') {
            window.dispatchEvent(new MessageEvent('message', { data: { type: 'agentWaiting', id } }));
          } else {
            window.dispatchEvent(new MessageEvent('message', { data: { type: 'agentDone', id } }));
          }
        }
      });
    }
  }, [rawAgentStatuses, layoutReady]);

  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isDebugMode, setIsDebugMode] = useState(false);
  const [alwaysShowOverlay, setAlwaysShowOverlay] = useState(false);

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), []);
  const handleToggleAlwaysShowOverlay = useCallback(() => setAlwaysShowOverlay((prev) => !prev), []);

  const handleSelectAgent = useCallback((id: number) => {
    if (onAgentClick) {
      const agent = initialAgents.find(a => parseInt(String(a.id).replace(/\D/g, ''), 10) === id);
      if (agent) onAgentClick(agent);
    }
  }, [initialAgents, onAgentClick]);

  const containerRef = useRef<HTMLDivElement>(null);

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0);
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  );

  const handleCloseAgent = useCallback((id: number) => {}, []);

  const officeState = getOfficeState();
  editorTickForKeyboard; // eslint-disable-line @typescript-eslint/no-unused-expressions

  useEffect(() => {
    const handleVoiceState = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { agentId, status } = customEvent.detail;
      const os = getOfficeState();
      
      const numAgentId = typeof agentId === 'string' ? parseInt(agentId.replace(/\D/g, ''), 10) : agentId;
      
      if (isNaN(numAgentId)) return;

      if (status === 'recording' || status === 'processing' || status === 'playing') {
        // Find a walkable tile closer to the bottom (camera), preferably in the agent's column
        const ch = os.characters.get(numAgentId);
        if (ch && os.walkableTiles.length > 0) {
          // Find tiles that are at least 1 or 2 rows below the agent
          let candidateTiles = os.walkableTiles.filter(t => t.row > ch.tileRow);
          
          if (candidateTiles.length === 0) {
             // If agent is already at the bottom, just use all walkable tiles
             candidateTiles = os.walkableTiles;
          }
          
          // Sort by: 1) closest to the agent's column, 2) furthest down (highest row)
          candidateTiles.sort((a, b) => {
            const colDistA = Math.abs(a.col - ch.tileCol);
            const colDistB = Math.abs(b.col - ch.tileCol);
            if (colDistA !== colDistB) return colDistA - colDistB;
            return b.row - a.row; 
          });

          // Try to walk to the best candidate
          for (const target of candidateTiles) {
             const success = os.walkToTile(numAgentId, target.col, target.row);
             if (success) break;
          }
        }
      } else if (status === 'idle') {
        os.sendToSeat(numAgentId);
      }
    };

    window.addEventListener('phaser:voiceState', handleVoiceState);
    return () => window.removeEventListener('phaser:voiceState', handleVoiceState);
  }, []);

  const showRotateHint =
    editor.isEditMode &&
    (() => {
      if (editorState.selectedFurnitureUid) {
        const item = officeState.getLayout().furniture.find((f) => f.uid === editorState.selectedFurnitureUid);
        if (item && isRotatable(item.type)) return true;
      }
      if (editorState.activeTool === EditTool.FURNITURE_PLACE && isRotatable(editorState.selectedFurnitureType)) {
        return true;
      }
      return false;
    })();

  if (!layoutReady) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vscode-foreground)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pixel-agents-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
        .pixel-agents-migration-btn:hover { filter: brightness(0.8); }
      ` }} />

      <OfficeCanvas
        officeState={officeState}
        onClick={handleSelectAgent}
        isEditMode={editor.isEditMode}
        editorState={editorState}
        onEditorTileAction={editor.handleEditorTileAction}
        onEditorEraseAction={editor.handleEditorEraseAction}
        onEditorSelectionChange={editor.handleEditorSelectionChange}
        onDeleteSelected={editor.handleDeleteSelected}
        onRotateSelected={editor.handleRotateSelected}
        onDragMove={editor.handleDragMove}
        editorTick={editor.editorTick}
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        panRef={editor.panRef}
      />

      {!isDebugMode && <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />}

      <div style={{ position: 'absolute', inset: 0, background: 'var(--pixel-vignette)', pointerEvents: 'none', zIndex: 40 }} />

      <BottomToolbar
        isEditMode={editor.isEditMode}
        onOpenClaude={editor.handleOpenClaude}
        onToggleEditMode={editor.handleToggleEditMode}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={handleToggleAlwaysShowOverlay}
        workspaceFolders={workspaceFolders}
      />

      {editor.isEditMode && editor.isDirty && (
        <EditActionBar editor={editor} editorState={editorState} />
      )}

      {showRotateHint && (
        <div style={{ position: 'absolute', top: editor.isDirty ? 52 : 8, left: '50%', transform: 'translateX(-50%)', zIndex: 49, background: 'var(--pixel-hint-bg)', color: '#fff', fontSize: '20px', padding: '3px 8px', borderRadius: 0, border: '2px solid var(--pixel-accent)', boxShadow: 'var(--pixel-shadow)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Rotate (R)
        </div>
      )}

      {editor.isEditMode &&
        (() => {
          const selUid = editorState.selectedFurnitureUid;
          const selColor = selUid ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null) : null;
          return (
            <EditorToolbar
              activeTool={editorState.activeTool}
              selectedTileType={editorState.selectedTileType}
              selectedFurnitureType={editorState.selectedFurnitureType}
              selectedFurnitureUid={selUid}
              selectedFurnitureColor={selColor}
              floorColor={editorState.floorColor}
              wallColor={editorState.wallColor}
              selectedWallSet={editorState.selectedWallSet}
              onToolChange={editor.handleToolChange}
              onTileTypeChange={editor.handleTileTypeChange}
              onFloorColorChange={editor.handleFloorColorChange}
              onWallColorChange={editor.handleWallColorChange}
              onWallSetChange={editor.handleWallSetChange}
              onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
              onFurnitureTypeChange={editor.handleFurnitureTypeChange}
              loadedAssets={loadedAssets}
            />
          );
        })()}

      {!isDebugMode && (
        <ToolOverlay
          officeState={officeState}
          agents={initialAgents.map(a => parseInt(String(a.id).replace(/\D/g, ''), 10)).filter(id => !isNaN(id))}
          agentTools={agentTools}
          subagentCharacters={subagentCharacters}
          containerRef={containerRef}
          zoom={editor.zoom}
          panRef={editor.panRef}
          onCloseAgent={handleCloseAgent}
          alwaysShowOverlay={alwaysShowOverlay}
        />
      )}

      {isDebugMode && (
        <DebugView
          agents={initialAgents.map(a => parseInt(String(a.id).replace(/\D/g, ''), 10)).filter(id => !isNaN(id))}
          selectedAgent={selectedAgent}
          agentTools={agentTools}
          agentStatuses={{}}
          subagentTools={subagentTools}
          onSelectAgent={handleSelectAgent}
        />
      )}

      {showMigrationNotice && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setMigrationNoticeDismissed(true)}>
          <div style={{ background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)', borderRadius: 0, padding: '24px 32px', maxWidth: 620, boxShadow: 'var(--pixel-shadow)', textAlign: 'center', lineHeight: 1.3 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '40px', marginBottom: 12, color: 'var(--pixel-accent)' }}>We owe you an apology!</div>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>We just migrated to fully open-source assets, all built from scratch with love. Unfortunately, this means your previous layout had to be reset.</p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>We're really sorry about that.</p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>The good news? This was a one-time thing, and it paves the way for some genuinely exciting updates ahead.</p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text-dim)', margin: '0 0 20px 0' }}>Stay tuned, and thanks for using Pixel Agents!</p>
            <button className="pixel-agents-migration-btn" style={{ padding: '6px 24px 8px', fontSize: '30px', background: 'var(--pixel-accent)', color: '#fff', border: '2px solid var(--pixel-accent)', borderRadius: 0, cursor: 'pointer', boxShadow: 'var(--pixel-shadow)' }} onClick={() => setMigrationNoticeDismissed(true)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
