/**
 * Custom Node.js server — serves Next.js + WebSocket on the same port.
 *
 * WebSocket endpoint: /api/ws/live
 * Everything else: Next.js App Router
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const { GoogleGenAI } = require('@google/genai');

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

/**
 * Direct Gemini Live WebSocket Session Manager
 *
 * Uses native ws.WebSocket to connect directly to the Gemini Multimodal Live API.
 * This avoids SDK abstractions and ensures reliable handshake & event delivery.
 */
class ServerGeminiLiveSession {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.currentKey = '';
    this.isActive = false;
  }

  async connect() {
    const orchestrator = getKeyOrchestrator();
    this.currentKey = orchestrator.getKey();

    let rawModel = (process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp').trim().replace(/^["']|["']$/g, '');
    if (!rawModel || rawModel.includes('2.5-flash-live-preview') || rawModel === 'gemini-live-2.5-flash-preview') {
      rawModel = 'gemini-2.0-flash-exp';
    }
    const modelName = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;

    const host = 'generativelanguage.googleapis.com';
    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.currentKey}`;

    const fullSystemPrompt = [
      this.config.systemPrompt,
      this.config.memoryBrief ? `\n\n--- Student Background ---\n${this.config.memoryBrief}` : '',
    ].join('');

    console.log(`[GeminiLive] Connecting to ${modelName}... (key: ${this.currentKey.slice(0, 8)}...)`);

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeoutTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.close();
          reject(new Error(`Gemini Live connection timed out after 12s (model: ${modelName})`));
        }
      }, 12000);

      try {
        const ws = new WebSocket(uri);
        this.ws = ws;

        ws.on('open', () => {
          console.log('[GeminiLive] WebSocket connected. Sending setup message...');
          const setupMsg = {
            setup: {
              model: modelName,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Aoede', // Friendly, clear voice
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: fullSystemPrompt }],
              },
            },
          };
          ws.send(JSON.stringify(setupMsg));
        });

        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());

            // Handshake complete
            if (data.setupComplete) {
              console.log('[GeminiLive] Setup completed successfully!');
              this.isActive = true;
              orchestrator.reportSuccess(this.currentKey);
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutTimer);
                resolve(this);
              }
              return;
            }

            // Server Content (Audio / Transcript)
            if (data.serverContent) {
              const { modelTurn, interrupted, turnComplete } = data.serverContent;

              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.inlineData?.data) {
                    this.config.onAudio(part.inlineData.data);
                  }
                  if (part.text) {
                    this.config.onTranscript('ai', part.text);
                  }
                }
              }

              if (interrupted) {
                console.log('[GeminiLive] Model interrupted by user');
              }
            }
          } catch (err) {
            console.error('[GeminiLive] Message parsing error:', err);
          }
        });

        ws.on('error', (err) => {
          console.error('[GeminiLive] Socket error:', err.message || err);
          const msg = err.message || 'Gemini Live WebSocket error';
          if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            orchestrator.reportExhausted(this.currentKey, msg);
          }
          this.config.onError(new Error(msg));
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutTimer);
            reject(err);
          }
        });

        ws.on('close', (code, reason) => {
          console.log(`[GeminiLive] Socket closed: code=${code}, reason=${reason?.toString() || 'none'}`);
          this.isActive = false;
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutTimer);
            reject(new Error(`Gemini Live closed connection during setup (code ${code}: ${reason?.toString() || 'no reason'})`));
          }
          this.config.onClose();
        });
      } catch (err) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutTimer);
          reject(err);
        }
      }
    });
  }

  sendAudio(pcmBase64) {
    if (!this.ws || !this.isActive || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const msg = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm;rate=16000',
              data: pcmBase64,
            },
          ],
        },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[GeminiLive] sendAudio error:', err.message || err);
      this.config.onError(err);
    }
  }

  sendText(text) {
    if (!this.ws || !this.isActive || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const msg = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[GeminiLive] sendText error:', err.message || err);
      this.config.onError(err);
    }
  }

  close() {
    this.isActive = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
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
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);

    // --- Diagnostic endpoint ---
    if (parsedUrl.pathname === '/api/debug') {
      res.setHeader('Content-Type', 'application/json');
      const orchestrator = getKeyOrchestrator();
      let testKey = '';
      try {
        testKey = orchestrator.getKey();
      } catch {}

      const diagnostics = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        env: {
          GEMINI_API_KEYS_set: !!(process.env.GEMINI_API_KEYS || '').trim(),
          GEMINI_API_KEYS_count: (process.env.GEMINI_API_KEYS || '').split(',').filter((k) => k.trim()).length,
          GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL || '(default: gemini-2.0-flash-exp)',
          GEMINI_TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || '(default: gemini-2.5-flash)',
          DATABASE_URL_set: !!(process.env.DATABASE_URL || '').trim(),
          NODE_ENV: process.env.NODE_ENV,
        },
        textApiTest: null,
        liveWsTest: null,
      };

      // 1. Test Text API (Standard generateContent to verify key validity)
      if (testKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: testKey });
          const response = await ai.models.generateContent({
            model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
            contents: 'Say "SpeakX is ready!" in 4 words.',
          });
          diagnostics.textApiTest = {
            status: 'success',
            response: response.text?.trim() || '(received response)',
          };
        } catch (err) {
          diagnostics.textApiTest = {
            status: 'error',
            message: err.message || String(err),
          };
        }

        // 2. Test Live WebSocket Handshake
        try {
          let rawModel = (process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp').trim().replace(/^["']|["']$/g, '');
          if (!rawModel || rawModel.includes('2.5-flash-live-preview') || rawModel === 'gemini-live-2.5-flash-preview') {
            rawModel = 'gemini-2.0-flash-exp';
          }
          const modelName = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;

          const host = 'generativelanguage.googleapis.com';
          const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${testKey}`;

          diagnostics.liveWsTest = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              try { testWs.close(); } catch {}
              resolve({ status: 'timeout', message: `No setup response from Google after 8s for ${modelName}` });
            }, 8000);

            const testWs = new WebSocket(uri);

            testWs.on('open', () => {
              testWs.send(
                JSON.stringify({
                  setup: {
                    model: modelName,
                    generationConfig: { responseModalities: ['AUDIO'] },
                  },
                })
              );
            });

            testWs.on('message', (raw) => {
              try {
                const msg = JSON.parse(raw.toString());
                if (msg.setupComplete) {
                  clearTimeout(timeout);
                  try { testWs.close(); } catch {}
                  resolve({ status: 'success', message: `Live WebSocket setupComplete received! Model: ${modelName}` });
                }
              } catch (e) {
                clearTimeout(timeout);
                try { testWs.close(); } catch {}
                resolve({ status: 'error', message: 'Failed to parse setup message: ' + e.message });
              }
            });

            testWs.on('error', (err) => {
              clearTimeout(timeout);
              resolve({ status: 'error', message: err.message || 'WebSocket error' });
            });

            testWs.on('close', (code, reason) => {
              clearTimeout(timeout);
              resolve({ status: 'closed', message: `Socket closed: code=${code}, reason=${reason?.toString() || 'none'}` });
            });
          });
        } catch (err) {
          diagnostics.liveWsTest = { status: 'error', message: err.message || String(err) };
        }
      }

      res.statusCode = 200;
      res.end(JSON.stringify(diagnostics, null, 2));
      return;
    }

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
            const scenarioPrompt = message.systemPrompt || 'You are a helpful conversation partner for communication practice.';
            const memoryBrief = message.memoryBrief || '';

            liveSession = new ServerGeminiLiveSession({
              systemPrompt: scenarioPrompt,
              memoryBrief: memoryBrief,
              onAudio: (audioData) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'audio', data: audioData }));
                }
              },
              onTranscript: (role, text) => {
                transcript.push({ role, text, timestamp: Date.now() });
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'transcript', role, text }));
                }
              },
              onError: (error) => {
                console.error('[WS] Live session error:', error.message);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
              },
              onClose: () => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'session-ended', transcript }));
                }
              },
            });

            await liveSession.connect();
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'connected' }));
            }
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
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'session-ended', transcript }));
            }
            console.log('[WS] Live session stopped');
            break;
          }

          default:
            console.warn('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Error handling message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: error.message || 'Unknown error' }));
        }
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
  ║  → Debug:     http://localhost:${port}/api/debug   ║
  ║  → Mode:      ${dev ? 'Development' : 'Production'}              ║
  ╚═══════════════════════════════════════════╝
    `);
  });
});
