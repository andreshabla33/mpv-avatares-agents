import React from 'react';
import DOMPurify from 'dompurify';
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';

export default function VoiceControl({ agenteId, agentName }) {
  const {
    isRecording,
    isProcessing,
    isPlaying,
    error,
    lastTranscription,
    lastResponse,
    startRecording,
    stopRecording,
    cancelPlayback
  } = useVoiceInteraction(agenteId);

  // Sanitize the inputs before rendering them, even if we assume they are safe text,
  // this prevents XSS if the LLM or an attacker injects HTML tags.
  const sanitizedTranscription = lastTranscription ? DOMPurify.sanitize(lastTranscription) : '';
  const sanitizedResponse = lastResponse ? DOMPurify.sanitize(lastResponse) : '';

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'var(--pixel-bg)',
      borderTop: '2px dashed var(--pixel-border)'
    }}>
      <h3 style={{
        color: 'var(--pixel-accent)',
        fontSize: '20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 16px 0'
      }}>
        <span style={{ width: '8px', height: '8px', background: 'var(--pixel-accent)', boxShadow: 'var(--pixel-shadow)' }} className="animate-pulse"></span>
        VOICE COMMAND
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {/* Main Control Button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing || isPlaying}
          style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isProcessing || isPlaying) ? 'default' : 'pointer',
            background: isRecording ? 'var(--pixel-danger-bg)' : isProcessing ? 'var(--pixel-status-permission)' : isPlaying ? 'var(--pixel-green)' : 'var(--pixel-btn-bg)',
            border: `2px solid ${isRecording ? '#ff4444' : isProcessing ? '#cca700' : isPlaying ? '#2ecc71' : 'var(--pixel-border)'}`,
            boxShadow: 'var(--pixel-shadow)',
            transition: 'transform 0.1s',
            transform: isRecording ? 'scale(0.95)' : 'scale(1)',
            opacity: isProcessing ? 0.8 : 1
          }}
        >
          {/* Status Icon */}
          <span style={{ fontSize: '32px' }}>
            {isRecording ? '🎙️' : isProcessing ? '⏳' : isPlaying ? '🔊' : '🎤'}
          </span>
        </button>

        {/* Status Text */}
        <div style={{ textAlign: 'center', height: '24px' }}>
          {error ? (
            <span style={{ color: '#ff4444', fontSize: '18px' }}>{error}</span>
          ) : isRecording ? (
            <span style={{ color: '#ff4444', fontSize: '18px' }} className="animate-pulse">Recording... Release to send</span>
          ) : isProcessing ? (
            <span style={{ color: '#cca700', fontSize: '18px' }} className="animate-pulse">{agentName} is thinking...</span>
          ) : isPlaying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#2ecc71', fontSize: '18px' }} className="animate-pulse">Playing response...</span>
              <button
                onClick={cancelPlayback}
                style={{ color: '#ff4444', fontSize: '18px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                (Stop)
              </button>
            </div>
          ) : (
            <span style={{ color: 'var(--pixel-text-dim)', fontSize: '18px' }}>Hold to speak</span>
          )}
        </div>

        {/* Transcription & Response Log */}
        {(sanitizedTranscription || sanitizedResponse) && (
          <div style={{ width: '100%', marginTop: '8px', borderTop: '2px dashed var(--pixel-border)', paddingTop: '12px' }}>
            {sanitizedTranscription && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--pixel-text-dim)', fontSize: '18px' }}>You:</span>
                <p style={{
                  color: 'var(--pixel-text)',
                  marginTop: '4px',
                  background: 'var(--pixel-btn-bg)',
                  padding: '8px',
                  border: '2px solid var(--pixel-border)',
                  fontSize: '18px'
                }}>"{sanitizedTranscription}"</p>
              </div>
            )}
            {sanitizedResponse && (
              <div>
                <span style={{ color: 'var(--pixel-accent)', fontSize: '18px' }}>{agentName}:</span>
                <p style={{
                  color: 'var(--pixel-text)',
                  marginTop: '4px',
                  background: 'var(--pixel-active-bg)',
                  padding: '8px',
                  border: '2px solid var(--pixel-accent)',
                  fontSize: '18px'
                }}>"{sanitizedResponse}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
