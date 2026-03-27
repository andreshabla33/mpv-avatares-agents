export class OpenAIService {
  private apiKey: string;
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    // Solo usa variable de entorno, no hay fallback hardcodeado
    const key = Deno.env.get('OPENAI_API_KEY_WHISPER');
    if (!key) throw new Error('OPENAI_API_KEY_WHISPER no está configurada');
    this.apiKey = key;
    this.timeoutMs = timeoutMs; // Default 30 segundos
  }

  // Helper para fetch con timeout - protección contra requests colgados
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout después de ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    
    // Extract extension from mime type (e.g., 'audio/webm' -> 'webm')
    // Fallback to 'webm' if not present
    let extension = 'webm';
    if (audioBlob.type) {
      const parts = audioBlob.type.split('/');
      if (parts.length === 2) {
        // Some mime types might have parameters like 'audio/webm;codecs=opus'
        extension = parts[1].split(';')[0];
      }
    }
    
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');

    const res = await this.fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (_) {
        // Ignorar error de parseo y usar el texto original
      }
      throw new Error(`Error en Whisper API: ${errMsg}`);
    }

    const data = await res.json();
    return data.text;
  }

  async generateSecureResponse(userText: string, systemPrompt: string): Promise<string> {
    const res = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.3
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (_) {
        // Ignorar
      }
      throw new Error(`Error en OpenAI Chat API: ${errMsg}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  async generateSpeech(text: string): Promise<ArrayBuffer> {
    const res = await this.fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy', // You can change this to 'echo', 'fable', 'onyx', 'nova', or 'shimmer'
        input: text
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (_) {
        // Ignorar
      }
      console.warn(`Advertencia en OpenAI TTS API: ${errMsg}. Devolviendo audio vacío.`);
      // En lugar de arrojar error y romper la respuesta (ya que el texto sí se generó),
      // devolvemos un ArrayBuffer vacío para que el frontend no falle si no hay permisos de TTS.
      return new ArrayBuffer(0);
    }

    return await res.arrayBuffer();
  }
}
