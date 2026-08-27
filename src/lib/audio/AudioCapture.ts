/**
 * AudioCapture — captures microphone audio using AudioWorklet,
 * converts to PCM, and sends chunks via a callback.
 */

export type AudioChunkCallback = (pcmBase64: string) => void;

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onChunk: AudioChunkCallback;
  private _isCapturing = false;

  constructor(onChunk: AudioChunkCallback) {
    this.onChunk = onChunk;
  }

  /**
   * Start capturing microphone audio.
   * Requests mic permission, sets up AudioWorklet, and begins streaming PCM chunks.
   */
  async start(): Promise<void> {
    if (this._isCapturing) return;

    // Request microphone access
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    // Create audio context at 16kHz (Gemini's expected input rate)
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    } catch {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Load the worklet processor
    await this.audioContext.audioWorklet.addModule('/worklet.js');

    // Create source from mic stream
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Create worklet node
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

    // Handle PCM data from the worklet
    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const pcmBuffer = event.data;
      // Convert ArrayBuffer to base64 for WebSocket transmission
      const base64 = this.arrayBufferToBase64(pcmBuffer);
      this.onChunk(base64);
    };

    // Connect the audio graph: mic → worklet
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination); // Required for processing

    this._isCapturing = true;
  }

  /**
   * Stop capturing audio and release resources.
   */
  stop(): void {
    this._isCapturing = false;

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  get isCapturing(): boolean {
    return this._isCapturing;
  }

  /**
   * Convert an ArrayBuffer to a base64 string.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
