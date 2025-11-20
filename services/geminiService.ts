
import { GoogleGenAI, Type } from "@google/genai";
import { IdentifiedItem, GeneratedVariation } from '../types';

export const analyzeImage = async (
  base64ImageData: string, 
  mimeType: string,
  focusPoint?: { x: number, y: number }
): Promise<IdentifiedItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let promptText = 'Identify all plants and animals in this image. For each, provide its common name, scientific name, and a brief, interesting fact or description. Also specify if it is a "Plant" or an "Animal". If nothing can be identified, return an empty array.';

  if (focusPoint) {
    promptText = `Identify the specific plant or animal located at approximately ${focusPoint.x.toFixed(0)}% from the left and ${focusPoint.y.toFixed(0)}% from the top of the image. Focus specifically on the object at this location marked by the user. Provide its common name, scientific name, and a brief, interesting fact. Also specify if it is a "Plant" or an "Animal". Return the result as an item in the array.`;
  }

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
            text: promptText,
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

export const generateSimilarImage = async (base64ImageData: string, mimeType: string): Promise<GeneratedVariation> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Step 1: Get a detailed description of the image
    const descriptionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType } },
          { text: "Analyze this image and provide a highly detailed, visual description of it. Focus on the subject, composition, colors, lighting, and style. This description will be used to generate a similar image using an AI image generator. Return ONLY the description text." }
        ]
      }
    });

    const description = descriptionResponse.text;
    if (!description) {
      throw new Error("Failed to generate image description.");
    }

    // Step 2: Generate a new image based on the description
    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: description,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      }
    });

    const generatedBase64 = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    if (!generatedBase64) {
      throw new Error("Failed to generate image from description.");
    }

    return {
      description,
      imageUrl: `data:image/jpeg;base64,${generatedBase64}`
    };

  } catch (error) {
    console.error("Error generating similar image:", error);
    throw new Error("Failed to generate a similar image.");
  }
};
