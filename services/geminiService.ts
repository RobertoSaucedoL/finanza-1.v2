import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AgentConfig } from "../types";

// Helper para obtener el cliente de forma segura
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key no encontrada en process.env");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

interface SendMessageOptions {
  message: string;
  history: { role: string; parts: { text: string }[] }[];
  config: AgentConfig;
}

export const createChatSession = (config: AgentConfig): Chat => {
  const ai = getClient();
  const tools = config.useSearch ? [{ googleSearch: {} }] : [];

  return ai.chats.create({
    model: config.model,
    config: {
      systemInstruction: config.systemInstruction,
      temperature: config.temperature,
      tools: tools,
    },
    history: [], // We manage history manually in the UI for display, but the Chat object manages context internally
  });
};

/**
 * Sends a message to the model using streaming.
 * Returns an async generator that yields partial text chunks.
 */
export async function* streamMessage(
  chat: Chat,
  message: string
): AsyncGenerator<{ text: string; groundingChunks?: any[] }, void, unknown> {
  
  try {
    const resultStream = await chat.sendMessageStream({
      message: message,
    });

    for await (const chunk of resultStream) {
      const responseChunk = chunk as GenerateContentResponse;
      
      // Extract text
      const text = responseChunk.text || '';
      
      // Extract grounding metadata if available
      const groundingChunks = responseChunk.candidates?.[0]?.groundingMetadata?.groundingChunks;

      yield { text, groundingChunks };
    }
  } catch (error) {
    console.error("Error in streamMessage:", error);
    throw error;
  }
}
