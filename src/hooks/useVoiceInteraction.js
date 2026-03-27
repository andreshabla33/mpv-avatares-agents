import { useState, useRef, useCallback } from 'react';

// Assuming we have the Supabase URL and Anon key in env or we can hardcode for this demo
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_NAME = 'agent-voice-interaction';
// For local testing with Deno directly (no Docker/Supabase CLI)
const API_URL = 'http://localhost:8000'; // Deno serves on 8000 by default

// Utility function to get token securely
// This should be replaced with an actual call to Supabase's getSession() method
// or a secure context that manages the token in memory, not localStorage.
async function getSecureSessionToken() {
  try {
    // Usa sessionStorage en lugar de localStorage para mayor seguridad
    // Los datos se limpian al cerrar la pestaña/browser
    const token = sessionStorage.getItem('supabase.auth.token');
    if (token) {
      const parsedToken = JSON.parse(token);
      return parsedToken.currentSession?.access_token || parsedToken.access_token;
    }
    
    // Para desarrollo local sin auth: retornar Anon Key
    return SUPABASE_ANON_KEY;
  } catch (_e) {
    return SUPABASE_ANON_KEY;
  }
}

export function useVoiceInteraction(agenteId) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [lastTranscription, setLastTranscription] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'recording' } }));
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
      setIsRecording(false);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
    }
  }, [agenteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
    }
  }, [isRecording, agenteId]);

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);
    window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'processing' } }));

    try {
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      // Ensure agent_id is strictly a number (e.g., parsing "agent-86" to "86")
      const numAgentId = typeof agenteId === 'string' ? agenteId.replace(/\D/g, '') : agenteId.toString();
      formData.append('agente_id', numAgentId);

      // Instead of reading raw localStorage, we should use Supabase's secure auth client.
      // For now, as a mitigation in this architecture, we expect the token to be passed 
      // securely or handled via HttpOnly cookies by the backend.
      // If we must pass it, we should get it from a secure Context/State provider, not localStorage.
      const token = await getSecureSessionToken(); 
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al comunicarse con el agente');
      }

      // Read custom headers for transcription and response text
      const transcription = response.headers.get('X-Transcription');
      const responseText = response.headers.get('X-Response-Text');
      
      if (transcription) setLastTranscription(decodeURIComponent(transcription));
      if (responseText) setLastResponse(decodeURIComponent(responseText));

      // Play the audio
      const audioBuffer = await response.arrayBuffer();
      
      if (audioBuffer.byteLength === 0) {
        console.warn("Recibido audio vacío desde el servidor (posible error de TTS). Mostrando solo texto.");
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: numAgentId, status: 'playing' } }));
        // Simulate reading time based on text length, or fallback to 3 seconds
        const readingTime = responseText ? Math.max(3000, responseText.length * 50) : 3000;
        setTimeout(() => {
          setIsProcessing(false);
          setIsPlaying(false);
          window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: numAgentId, status: 'idle' } }));
        }, readingTime);
        return;
      }

      const audioBlobResponse = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'playing' } }));
      
      audio.onended = () => {
        setIsProcessing(false);
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        console.warn('Error playing audio');
        setIsProcessing(false);
        setIsPlaying(false);
        window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();

    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err.message);
      setIsProcessing(false);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
    }
  };

  const cancelPlayback = useCallback(() => {
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      window.dispatchEvent(new CustomEvent('phaser:voiceState', { detail: { agentId: agenteId, status: 'idle' } }));
    }
  }, [isPlaying, agenteId]);

  return {
    isRecording,
    isProcessing,
    isPlaying,
    error,
    lastTranscription,
    lastResponse,
    startRecording,
    stopRecording,
    cancelPlayback
  };
}
