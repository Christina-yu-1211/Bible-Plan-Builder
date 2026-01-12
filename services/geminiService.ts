import { GoogleGenAI } from "@google/genai";

export const generateBackgroundImage = async (prompt: string): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Instructions say: "Generate images using gemini-2.5-flash-image by default"
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a soft, subtle, artistic background image suitable for a printed document. Style: ${prompt}. Low contrast, high brightness, watermark style, no text.` }
        ]
      }
    });

    // Instructions: "The output response may contain both image and text parts; you must iterate through all parts to find the image part."
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.warn("No image part found in response");
    return null;

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};