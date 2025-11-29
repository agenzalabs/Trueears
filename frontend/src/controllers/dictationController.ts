import { GroqService } from '../services/groqService';
import { GroqChatService } from '../services/groqChatService';
import { AppProfileService } from '../services/appProfileService';
import { playSuccessSound } from '../utils/soundUtils';
import { tauriAPI } from '../utils/tauriApi';
import { ActiveWindowInfo } from '../types/appProfile';

export const processTranscription = async (audioBlob: Blob, apiKey: string, model: string, language?: string): Promise<string> => {
  return await GroqService.transcribe(audioBlob, apiKey, model, language);
};

export const postProcessTranscription = async (
  rawText: string,
  windowInfo: ActiveWindowInfo | null,
  llmApiKey: string,
  llmModel: string,
  defaultPrompt: string
): Promise<string> => {
  try {
    console.log('[DictationController] Window info:', windowInfo);
    const systemPrompt = AppProfileService.getSystemPrompt(windowInfo, defaultPrompt);
    console.log('[DictationController] Using system prompt:', systemPrompt.substring(0, 100) + '...');
    console.log('[DictationController] Raw text to format:', rawText);
    
    const formattedText = await GroqChatService.formatTranscription(
      rawText,
      systemPrompt,
      llmApiKey,
      llmModel
    );
    
    console.log('[DictationController] Formatted result:', formattedText);
    return formattedText;
  } catch (error) {
    console.error('[DictationController] Post-processing failed, using raw text:', error);
    // Fallback to raw text if LLM fails
    return rawText;
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
