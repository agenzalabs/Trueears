import { GroqService } from '../services/groqService';
import { GeminiService } from '../services/geminiService';
import { playSuccessSound } from '../utils/soundUtils';
import { Provider } from '../hooks/useSettings';
import { tauriAPI } from '../utils/tauriApi';

export const processTranscription = async (audioBlob: Blob, provider: Provider, apiKey: string, model: string): Promise<string> => {
  if (provider === 'gemini') {
    return await GeminiService.transcribe(audioBlob, apiKey, model);
  } else {
    return await GroqService.transcribe(audioBlob, apiKey, model);
  }
};

export const finalizeDictation = async (text: string) => {
  try {
    await tauriAPI.sendTranscription(text);
    playSuccessSound();
  } catch (error) {
    console.error("Failed to send transcription:", error);
  }
};
