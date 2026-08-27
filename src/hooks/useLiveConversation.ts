'use client';

import { useCallback, useRef, useState } from 'react';
import type { TranscriptMessage } from '@/components/practice/TranscriptView';

export type SessionState = 'idle' | 'connecting' | 'active' | 'ending';
export type MicState = 'idle' | 'listening' | 'ai-speaking' | 'connecting';

interface UseLiveConversationReturn {
  sessionState: SessionState;
  micState: MicState;
  transcript: TranscriptMessage[];
  startSession: (systemPrompt: string, memoryBrief?: string) => void;
  stopSession: () => void;
  toggleMic: () => void;
  error: string | null;
  sessionId: string | null;
}

export function useLiveConversation(): UseLiveConversationReturn {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [micState, setMicState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // --- Audio Playback ---
  const playNext = useCallback(() => {
    if (playbackQueueRef.current.length === 0 || !playbackContextRef.current) {
      isPlayingRef.current = false;
      setMicState((prev) => prev === 'ai-speaking' ? 'listening' : prev);
      return;
    }

    isPlayingRef.current = true;
    setMicState('ai-speaking');

    const buffer = playbackQueueRef.current.shift()!;
    const source = playbackContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContextRef.current.destination);
    source.onended = () => playNext();
    source.start();
  }, []);

  const enqueueAudio = useCallback((pcmBase64: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;

    // Decode base64 -> Int16 -> Float32
    const binary = atob(pcmBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    playbackQueueRef.current.push(audioBuffer);

    if (!isPlayingRef.current) playNext();
  }, [playNext]);

  // --- WebSocket ---
  const connectWs = useCallback((systemPrompt: string, memoryBrief?: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/live`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start',
        systemPrompt,
        memoryBrief: memoryBrief || '',
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'connected':
            setSessionState('active');
            setMicState('listening');
            setError(null);
            break;

          case 'audio':
            enqueueAudio(msg.data);
            break;

          case 'transcript':
            setTranscript((prev) => [
              ...prev,
              {
                id: `${msg.role}-${Date.now()}-${Math.random()}`,
                role: msg.role,
                text: msg.text,
                timestamp: Date.now(),
              },
            ]);
            break;

          case 'error':
            setError(msg.message);
            break;

          case 'session-ended':
            setSessionState('idle');
            setMicState('idle');
            break;
        }
      } catch {
        // Non-JSON message, ignore
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed');
      setSessionState('idle');
      setMicState('idle');
    };

    ws.onclose = () => {
      if (sessionState === 'active') {
        setSessionState('idle');
        setMicState('idle');
      }
    };
  }, [enqueueAudio, sessionState]);

  // --- Mic Capture ---
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/worklet.js');

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Send raw binary PCM over WebSocket
          wsRef.current.send(event.data);
        }
      };

      source.connect(workletNode);
      // Connect to destination to keep processing alive (won't actually play mic audio)
      workletNode.connect(audioContext.destination);
    } catch (err) {
      setError('Microphone access denied. Please allow mic access and try again.');
      console.error('Mic error:', err);
    }
  }, []);

  const stopMic = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  // --- Public API ---
  const startSession = useCallback((systemPrompt: string, memoryBrief?: string) => {
    const id = `session-${Date.now()}`;
    setSessionId(id);
    setSessionState('connecting');
    setMicState('connecting');
    setTranscript([]);
    setError(null);

    connectWs(systemPrompt, memoryBrief);
    startMic();
  }, [connectWs, startMic]);

  const stopSession = useCallback(() => {
    setSessionState('ending');

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    wsRef.current?.close();
    wsRef.current = null;

    stopMic();

    // Flush playback
    playbackQueueRef.current = [];
    playbackContextRef.current?.close();
    playbackContextRef.current = null;
    isPlayingRef.current = false;

    setSessionState('idle');
    setMicState('idle');
  }, [stopMic]);

  const toggleMic = useCallback(() => {
    if (sessionState === 'idle') return;

    if (micState === 'listening') {
      stopMic();
      setMicState('idle');
    } else if (micState === 'idle') {
      startMic();
      setMicState('listening');
    }
    // If AI is speaking, flush and start listening (barge-in)
    if (micState === 'ai-speaking') {
      playbackQueueRef.current = [];
      isPlayingRef.current = false;
      startMic();
      setMicState('listening');
    }
  }, [sessionState, micState, startMic, stopMic]);

  return {
    sessionState,
    micState,
    transcript,
    startSession,
    stopSession,
    toggleMic,
    error,
    sessionId,
  };
}
