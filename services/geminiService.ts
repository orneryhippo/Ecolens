
import { GoogleGenAI, Type } from "@google/genai";
import { IdentifiedItem } from '../types';

export const analyzeImage = async (base64ImageData: string, mimeType: string): Promise<IdentifiedItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: 'Identify all plants and animals in this image. For each, provide its common name, scientific name, and a brief, interesting fact or description. Also specify if it is a "Plant" or an "Animal". If nothing can be identified, return an empty array.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commonName: { type: Type.STRING, description: 'The common name of the identified species.' },
              scientificName: { type: Type.STRING, description: 'The scientific (Latin) name of the species.' },
              description: { type: Type.STRING, description: 'A brief, interesting fact or description about the species.' },
              type: {
                type: Type.STRING,
                enum: ['Plant', 'Animal'],
                description: 'The type of the species, either "Plant" or "Animal".'
              },
            },
            required: ['commonName', 'scientificName', 'description', 'type'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    if (jsonText) {
      return JSON.parse(jsonText) as IdentifiedItem[];
    }
    return [];
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw new Error("Failed to analyze the image. The AI model could not process the request.");
  }
};
