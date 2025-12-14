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
  const isRefusal = (text: string) => {
    const lower = text.toLowerCase();
    return [
      'i cannot',
      "i can't",
      'i can’t',
      "can't do that",
      'cannot do that',
      "can't perform",
      'cannot perform',
      "i'm unable",
      'i am unable',
      'as an ai'
    ].some(phrase => lower.includes(phrase));
  };

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
    
    if (isRefusal(formattedText)) {
      console.warn('[DictationController] LLM response looks like a refusal, falling back to raw text');
      return rawText;
    }

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

export const transformSelectedText = async (
  selectedText: string,
  instruction: string,
  llmApiKey: string,
  llmModel: string
): Promise<string> => {
  console.log('[DictationController] Transforming selected text...');
  console.log('[DictationController] Selected text:', selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''));
  console.log('[DictationController] Instruction:', instruction);
  
  const transformedText = await GroqChatService.transformText(
    selectedText,
    instruction,
    llmApiKey,
    llmModel
  );
  
  console.log('[DictationController] Transformed result:', transformedText.substring(0, 100) + (transformedText.length > 100 ? '...' : ''));
  return transformedText;
};
