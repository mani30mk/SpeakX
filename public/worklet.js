/**
 * AudioWorkletProcessor — runs in the audio thread.
 * Converts Float32 mic samples to Int16 PCM and posts them to the main thread.
 *
 * This file is loaded directly by the browser's AudioWorklet engine as pure JavaScript.
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // mono
    if (!channelData || channelData.length === 0) return true;

    // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Post the PCM buffer to the main thread
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

    return true; // Keep the processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
