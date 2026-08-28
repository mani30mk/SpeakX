/**
 * Gemini Live API Session Manager (server-side)
 *
 * Manages bidirectional WebSocket sessions with Gemini's Live API
 * for real-time voice conversations using the @google/genai SDK.
 */
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { getKeyOrchestrator } from '../keyOrchestrator';

// Per @google/genai v2.19.0 SDK docs: Google AI model for Live API
const LIVE_MODEL = (process.env.GEMINI_LIVE_MODEL ?? 'gemini-live-2.5-flash-preview').trim();

export interface LiveSessionConfig {
  systemPrompt: string;
  memoryBrief?: string;
  onAudio: (audioData: string) => void;        // base64 PCM audio chunk
  onTranscript: (role: 'user' | 'ai', text: string) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class GeminiLiveSession {
  private session: Session | null = null;
  private config: LiveSessionConfig;
  private currentKey: string = '';
  private isActive = false;

  constructor(config: LiveSessionConfig) {
    this.config = config;
  }

  /**
   * Start the Live API session
   */
  async connect(): Promise<void> {
    const orchestrator = getKeyOrchestrator();
    this.currentKey = orchestrator.getKey();

    const client = new GoogleGenAI({ apiKey: this.currentKey });

    const fullSystemPrompt = [
      this.config.systemPrompt,
      this.config.memoryBrief ? `\n\n--- Student Background ---\n${this.config.memoryBrief}` : '',
    ].join('');

    try {
      this.session = await client.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: fullSystemPrompt }],
          },
        },
        callbacks: {
          onopen: () => {
            this.isActive = true;
            orchestrator.reportSuccess(this.currentKey);
          },
          onmessage: (e: LiveServerMessage) => {
            if (!this.isActive) return;

            const serverContent = e.serverContent;
            if (!serverContent) return;

            // Process model audio and text responses
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.config.onAudio(part.inlineData.data);
                }
                if (part.text) {
                  this.config.onTranscript('ai', part.text);
                }
              }
            }
          },
          onerror: (e) => {
            const err = new Error(e.message || 'Live session error');
            if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) {
              orchestrator.reportExhausted(this.currentKey, e.message);
            }
            this.config.onError(err);
          },
          onclose: () => {
            this.isActive = false;
            this.config.onClose();
          },
        },
      });

      this.isActive = true;
      orchestrator.reportSuccess(this.currentKey);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        orchestrator.reportExhausted(this.currentKey, err.message);
        // Retry with next available key
        return this.connect();
      }
      throw error;
    }
  }

  /**
   * Send realtime audio data to Gemini
   */
  sendAudio(pcmBase64: string): void {
    if (!this.session || !this.isActive) return;

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: pcmBase64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        getKeyOrchestrator().reportExhausted(this.currentKey, err.message);
        this.config.onError(new Error('API quota exhausted, please reconnect'));
      } else {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * Send a text message to Gemini (text-based fallback / turn injection)
   */
  sendText(text: string): void {
    if (!this.session || !this.isActive) return;

    try {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  /**
   * Disconnect the session
   */
  close(): void {
    this.isActive = false;

    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Ignore close errors
      }
      this.session = null;
    }

    this.config.onClose();
  }

  disconnect(): void {
    this.close();
  }

  get active(): boolean {
    return this.isActive;
  }
}
