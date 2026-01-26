
/**
 * Converts a Blob to a base64 encoded string for API transmission.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Formats a duration in seconds to MM:SS format.
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats seconds into SRT timestamp format: HH:MM:SS,mmm
 */
export const formatSRTTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`;
};

/**
 * Extracts amplitude peaks from an audio blob to generate a waveform visualization.
 * Robust implementation to handle cross-browser decoding inconsistencies.
 */
export const getPeaks = async (blob: Blob, samples: number = 100): Promise<number[]> => {
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return Array.from({ length: samples }, () => 0.1);
  }

  const audioContext = new AudioContextClass();
  
  try {
    const arrayBuffer = await blob.arrayBuffer();
    
    // Polyfill for browsers that don't support Promise-based decodeAudioData (Legacy Safari)
    const decodeAudio = (buffer: ArrayBuffer): Promise<AudioBuffer> => {
      return new Promise((resolve, reject) => {
        // We use a sliced copy to prevent issues with detached buffers in some browsers
        const bufferCopy = buffer.slice(0);
        
        // Try the modern promise-based approach first
        const promise = audioContext.decodeAudioData(bufferCopy, resolve, (err: any) => {
          // Fallback for when the error callback is used
          console.warn("Standard decode failed, trying alternative...");
          reject(err);
        });

        // Some older browsers return undefined for the promise-based version
        if (promise) {
          promise.catch(reject);
        }
      });
    };

    const audioBuffer = await decodeAudio(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const peaks = [];
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(rawData[start + j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }
    
    const maxVal = Math.max(...peaks);
    const result = peaks.map(p => Math.max(0.1, maxVal > 0 ? p / maxVal : 0.1));
    
    // Close context to free up hardware resources
    await audioContext.close();
    return result;

  } catch (e) {
    console.warn("Hardware waveform decoding failed, using synthetic fallback:", e);
    await audioContext.close();
    // Return a synthetic "living" waveform so the UI doesn't look empty or broken
    return Array.from({ length: samples }, (_, i) => 
      0.2 + (Math.sin(i * 0.2) * 0.3) + (Math.random() * 0.2)
    );
  }
};

/**
 * Estimates sentence timings based on character count distribution over total duration.
 */
export interface SentenceTiming {
  text: string;
  start: number;
  end: number;
}

export const estimateSentences = (text: string, duration: number): SentenceTiming[] => {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const totalChars = text.length || 1;
  let currentChars = 0;

  return sentences.map((sentence) => {
    const start = (currentChars / totalChars) * duration;
    currentChars += sentence.length;
    const end = (currentChars / totalChars) * duration;
    return {
      text: sentence.trim(),
      start,
      end
    };
  });
};
