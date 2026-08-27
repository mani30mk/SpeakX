/**
 * Custom Node.js server — serves Next.js + WebSocket on the same port.
 *
 * WebSocket endpoint: /api/ws/live
 * Everything else: Next.js App Router
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { GoogleGenAI, Modality } = require('@google/genai');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Key Orchestrator for API key rotation & quota handling
class ServerKeyOrchestrator {
  constructor(config = {}) {
    this.cooldownMs = config.cooldownMs || 60000;
    this.pool = (config.keys || []).map((key) => ({
      key,
      requestCount: 0,
      lastError: null,
      cooldownUntil: 0,
      isHealthy: true,
    }));
    this.currentIndex = 0;
  }

  getKey() {
    const now = Date.now();
    const poolSize = this.pool.length;
    if (poolSize === 0) {
      throw new Error('No GEMINI_API_KEYS configured! Please check your environment variables.');
    }

    for (let i = 0; i < poolSize; i++) {
      const idx = (this.currentIndex + i) % poolSize;
      const entry = this.pool[idx];

      if (entry.cooldownUntil > 0 && now >= entry.cooldownUntil) {
        entry.cooldownUntil = 0;
        entry.isHealthy = true;
        entry.lastError = null;
      }

      if (entry.isHealthy) {
        this.currentIndex = (idx + 1) % poolSize;
        entry.requestCount++;
        return entry.key;
      }
    }

    const soonest = this.pool.reduce((min, entry) =>
      entry.cooldownUntil < min.cooldownUntil ? entry : min
    );
    const waitMs = Math.max(0, soonest.cooldownUntil - now);
    throw new Error(`All API keys are on cooldown. Nearest recovery in ${Math.ceil(waitMs / 1000)}s.`);
  }

  reportExhausted(key, errorMsg) {
    const entry = this.pool.find((e) => e.key === key);
    if (!entry) return;
    entry.isHealthy = false;
    entry.cooldownUntil = Date.now() + this.cooldownMs;
    entry.lastError = errorMsg || 'RESOURCE_EXHAUSTED';
    console.warn(`[KeyOrchestrator] Key ${key.slice(0, 8)}… exhausted. Cooldown until ${new Date(entry.cooldownUntil).toISOString()}`);
  }

  reportSuccess(key) {
    const entry = this.pool.find((e) => e.key === key);
    if (!entry) return;
    entry.isHealthy = true;
    entry.lastError = null;
    entry.cooldownUntil = 0;
  }
}

let keyOrchestratorInstance = null;
function getKeyOrchestrator() {
  if (!keyOrchestratorInstance) {
    const rawKeys = process.env.GEMINI_API_KEYS || '';
    const keys = rawKeys.split(',').map((k) => k.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    keyOrchestratorInstance = new ServerKeyOrchestrator({ keys });
  }
  return keyOrchestratorInstance;
}

// Gemini Live API Session Manager
class ServerGeminiLiveSession {
  constructor(config) {
    this.config = config;
    this.session = null;
    this.currentKey = '';
    this.isActive = false;
  }

  async connect() {
    const orchestrator = getKeyOrchestrator();
    this.currentKey = orchestrator.getKey();

    const client = new GoogleGenAI({ apiKey: this.currentKey });
    const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-live-preview';

    const fullSystemPrompt = [
      this.config.systemPrompt,
      this.config.memoryBrief ? `\n\n--- Student Background ---\n${this.config.memoryBrief}` : '',
    ].join('');

    try {
      this.session = await client.live.connect({
        model: liveModel,
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
          onmessage: (e) => {
            if (!this.isActive) return;
            const serverContent = e.serverContent;
            if (!serverContent) return;

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
    } catch (error) {
      const err = error;
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        orchestrator.reportExhausted(this.currentKey, err.message);
        return this.connect();
      }
      throw error;
    }
  }

  sendAudio(pcmBase64) {
    if (!this.session || !this.isActive) return;
    try {
      this.session.sendRealtimeInput({
        audio: {
          data: pcmBase64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (error) {
      const err = error;
      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        getKeyOrchestrator().reportExhausted(this.currentKey, err.message);
        this.config.onError(new Error('API quota exhausted, please reconnect'));
      } else {
        this.config.onError(error);
      }
    }
  }

  sendText(text) {
    if (!this.session || !this.isActive) return;
    try {
      this.session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    } catch (error) {
      this.config.onError(error);
    }
  }

  close() {
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

  disconnect() {
    this.close();
  }
}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // --- WebSocket Server ---
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    if (pathname === '/api/ws/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    let liveSession = null;
    let transcript = [];
    let sessionConfig = null;

    ws.on('message', async (data, isBinary) => {
      try {
        if (isBinary) {
          // Binary data = PCM audio chunk from the browser
          if (liveSession) {
            const base64 = Buffer.from(data).toString('base64');
            liveSession.sendAudio(base64);
          }
          return;
        }

        // Text message = JSON control message
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'start': {
            sessionConfig = message;
            const scenarioPrompt = message.systemPrompt || 'You are a helpful conversation partner for communication practice.';
            const memoryBrief = message.memoryBrief || '';

            liveSession = new ServerGeminiLiveSession({
              systemPrompt: scenarioPrompt,
              memoryBrief: memoryBrief,
              onAudio: (audioData) => {
                ws.send(JSON.stringify({ type: 'audio', data: audioData }));
              },
              onTranscript: (role, text) => {
                transcript.push({ role, text, timestamp: Date.now() });
                ws.send(JSON.stringify({ type: 'transcript', role, text }));
              },
              onError: (error) => {
                console.error('[WS] Live session error:', error.message);
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
              },
              onClose: () => {
                ws.send(JSON.stringify({ type: 'session-ended', transcript }));
              },
            });

            await liveSession.connect();
            ws.send(JSON.stringify({ type: 'connected' }));
            console.log('[WS] Live session started');
            break;
          }

          case 'text': {
            if (liveSession) {
              liveSession.sendText(message.text);
            }
            transcript.push({ role: 'user', text: message.text, timestamp: Date.now() });
            break;
          }

          case 'stop': {
            if (liveSession) {
              liveSession.disconnect();
              liveSession = null;
            }
            ws.send(JSON.stringify({ type: 'session-ended', transcript }));
            console.log('[WS] Live session stopped');
            break;
          }

          default:
            console.warn('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Error handling message:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message || 'Unknown error' }));
      }
    });

    ws.on('close', async () => {
      console.log('[WS] Client disconnected');
      if (liveSession) {
        liveSession.disconnect();
        liveSession = null;
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });

  server.listen(port, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║          🎙️  SpeakX Server Ready          ║
  ║                                           ║
  ║  → App:       http://localhost:${port}        ║
  ║  → WebSocket: ws://localhost:${port}/api/ws/live ║
  ║  → Mode:      ${dev ? 'Development' : 'Production'}              ║
  ╚═══════════════════════════════════════════╝
    `);
  });
});
