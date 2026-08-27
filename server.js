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

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // --- Database initialization ---
  try {
    // Dynamic import for ESM module
    const dbModule = await import('./src/lib/db.ts').catch(() => null);
    if (dbModule) {
      console.log('[Server] DB module loaded via import');
    }
  } catch {
    console.log('[Server] DB will be initialized on first request');
  }

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
            await liveSession.sendAudio(base64);
          }
          return;
        }

        // Text message = JSON control message
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'start': {
            // Client wants to start a Live session
            sessionConfig = message;
            const scenarioPrompt = message.systemPrompt || 'You are a helpful conversation partner for communication practice.';
            const memoryBrief = message.memoryBrief || '';

            // Lazy-import the live session module
            const { GeminiLiveSession } = await import('./src/lib/gemini/liveSession.ts');

            liveSession = new GeminiLiveSession({
              systemPrompt: scenarioPrompt,
              memoryBrief: memoryBrief,
              onAudio: (audioData) => {
                // Send audio back to the browser
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
            // Text input (fallback or transcript addition)
            if (liveSession) {
              await liveSession.sendText(message.text);
            }
            transcript.push({ role: 'user', text: message.text, timestamp: Date.now() });
            break;
          }

          case 'stop': {
            // Client wants to end the session
            if (liveSession) {
              await liveSession.disconnect();
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
        await liveSession.disconnect();
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
