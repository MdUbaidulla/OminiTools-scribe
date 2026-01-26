import { GoogleGenAI } from "@google/genai";

/**
 * Sends audio data to Gemini 3 Flash for high-accuracy transcription.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string, language: string = 'auto'): Promise<string> => {
  // Always use new GoogleGenAI with { apiKey: process.env.API_KEY } as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const languageInstruction = language === 'auto' 
    ? "Detect the language of this audio automatically." 
    : `The audio is in ${language}. Please transcribe it accurately in that language.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType
            }
          },
          {
            text: `${languageInstruction} 
            Transcribe this audio accurately. 
            
            DIRECTIONS:
            1. Identify Speakers: If there are multiple speakers, label them (e.g., 'Speaker 1:', 'Speaker 2:').
            2. Detect Music: If the audio contains music, identify it and include it in the transcript using the format '[Music: StartTime - EndTime]' (e.g., '[Music: 00:12 - 00:45]'). Provide a brief description if possible (e.g., '[Music: Upbeat background music 01:20 - 01:45]').
            3. Formatting: Output only the transcription text as a clean dialogue or monologue. 
            4. No Conversational Fillers: Do not include any preamble or AI conversational fillers.`
          }
        ]
      }
    });

    // Access the .text property directly instead of calling a method.
    const text = response.text;
    if (!text) {
      throw new Error("The model did not return any transcription text.");
    }
    return text.trim();
  } catch (error) {
    console.error("Transcription service error:", error);
    throw error;
  }
};