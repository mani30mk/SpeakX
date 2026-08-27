/**
 * AudioPlayback — plays PCM audio chunks received from Gemini Live API.
 * Handles buffering, playback queue, and barge-in (flush on user speech).
 */

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private _isSpeaking = false;

  // Gemini outputs 24kHz PCM
  private readonly sampleRate = 24000;

  constructor() {}

  /**
   * Initialize the audio context. Must be called after a user gesture.
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);
  }

  /**
   * Enqueue a PCM audio chunk for playback.
   * @param pcmBase64 - Base64-encoded PCM audio (16-bit, 24kHz)
   */
  enqueue(pcmBase64: string): void {
    if (!this.audioContext || !this.gainNode) return;

    // Decode base64 to ArrayBuffer
    const binaryString = atob(pcmBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert Int16 PCM to Float32 for Web Audio
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    this.queue.push(audioBuffer);

    // Start playing if not already
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Play the next chunk in the queue.
   */
  private playNext(): void {
    if (this.queue.length === 0 || !this.audioContext || !this.gainNode) {
      this.isPlaying = false;
      this._isSpeaking = false;
      return;
    }

    this.isPlaying = true;
    this._isSpeaking = true;

    const buffer = this.queue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    this.currentSource = source;
    source.start();
  }

  /**
   * Flush the playback queue and stop current audio.
   * Used for barge-in when the user starts speaking.
   */
  flush(): void {
    this.queue = [];

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this._isSpeaking = false;
  }

  /**
   * Set playback volume.
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Whether the AI is currently speaking (audio is playing).
   */
  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.flush();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}
