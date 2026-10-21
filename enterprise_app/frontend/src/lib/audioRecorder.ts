/**
 * Cross-platform Audio Recorder for Web & Mobile.
 * Encodes directly into standard 16-bit PCM mono WAV (16kHz).
 * Supported natively by Python without requiring external C libraries (ffmpeg/libsndfile).
 */

export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private samples: Float32Array[] = [];
  private sampleRate: number = 16000;
  private isRecording: boolean = false;
  private peakLevel: number = 0;
  private totalRmsSum: number = 0;
  private rmsCount: number = 0;

  async start(onVolumeChange?: (volume: { rms: number; peak: number; percentage: number }) => void): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported or blocked in this browser.");
    }

    this.samples = [];
    this.peakLevel = 0;
    this.totalRmsSum = 0;
    this.rmsCount = 0;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: 16000 });

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.sampleRate = this.audioContext.sampleRate || 16000;
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.inputNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 2048 gives rapid ~130ms volume meter updates at 16kHz
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      this.samples.push(new Float32Array(input));

      if (onVolumeChange) {
        let sumSq = 0;
        let peak = 0;
        for (let i = 0; i < input.length; i++) {
          const abs = Math.abs(input[i]);
          if (abs > peak) peak = abs;
          sumSq += abs * abs;
        }
        const rms = Math.sqrt(sumSq / input.length);
        if (peak > this.peakLevel) this.peakLevel = peak;
        this.totalRmsSum += rms;
        this.rmsCount++;

        // Calculate logarithmic visual percentage (0-100%)
        // -50dB to 0dB range mapped to 0-100%
        const db = 20 * Math.log10(Math.max(rms, 1e-4));
        const percentage = Math.min(100, Math.max(0, Math.round(((db + 50) / 50) * 100)));

        onVolumeChange({ rms, peak, percentage });
      }
    };

    this.inputNode.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  getMetrics() {
    const avgRms = this.rmsCount > 0 ? this.totalRmsSum / this.rmsCount : 0;
    const duration = this.samples.reduce((acc, s) => acc + s.length, 0) / this.sampleRate;
    return {
      durationSeconds: duration,
      peakAmplitude: this.peakLevel,
      averageRms: avgRms,
      isSilent: avgRms < 0.005,
      isClipping: this.peakLevel >= 0.98,
    };
  }

  stop(): Blob {
    this.isRecording = false;

    if (this.processor && this.inputNode) {
      this.inputNode.disconnect();
      this.processor.disconnect();
      this.processor = null;
      this.inputNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Merge recorded chunks into a single Float32Array
    let totalLength = 0;
    for (const chunk of this.samples) {
      totalLength += chunk.length;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.samples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return this.encodeWav(merged, this.sampleRate);
  }

  private encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, "RIFF");
    // file length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    this.writeString(view, 8, "WAVE");
    // format chunk identifier
    this.writeString(view, 12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw PCM)
    view.setUint16(20, 1, true);
    // channel count (1 = mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * 2)
    view.setUint32(28, sampleRate * 2, true);
    // block align (1 * 2)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, "data");
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
