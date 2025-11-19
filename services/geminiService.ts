import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  static async transcribe(audioBlob: Blob, apiKey: string): Promise<string> {
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:audio/webm;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Initialize client with dynamic key
      const client = new GoogleGenAI({ apiKey });
      
      const modelName = 'gemini-2.5-flash-native-audio-preview-09-2025';
      console.log(`[GeminiService] Using model: ${modelName}`);

      // Use Gemini 1.5 Flash for reliable audio support
      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              { text: "Transcribe the following audio exactly as spoken. Do not add any commentary." },
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: base64Audio
                }
              }
            ]
          }
        ]
      });

      const text = response.text;
      return text || "";
    } catch (error) {
      console.error("Gemini Transcription Error:", error);
      throw error;
    }
  }
}