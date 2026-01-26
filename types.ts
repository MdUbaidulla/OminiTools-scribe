
export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  ERROR = 'ERROR'
}
