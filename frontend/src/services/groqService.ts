export class GroqService {
  private static readonly API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

  private static getAudioFilename(audioBlob: Blob): string {
    const mimeType = audioBlob.type.toLowerCase();

    if (mimeType.includes('wav')) return 'recording.wav';
    if (mimeType.includes('ogg')) return 'recording.ogg';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'recording.m4a';

    return 'recording.webm';
  }

  static async tranTrueears(audioBlob: Blob, apiKey: string, model: string, language?: string): Promise<string> {
    const formData = new FormData();
    // Groq accepts m4a, mp3, webm, mp4, mpga, wav, mpeg
    formData.append('file', audioBlob, this.getAudioFilename(audioBlob));
    formData.append('model', model);
    // temperature 0 makes the output deterministic
    formData.append('temperature', '0');
    // Language hint for transcription (if not auto-detect)
    if (language) {
      formData.append('language', language);
    }  

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Do not set Content-Type header manually; fetch sets it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }
}
