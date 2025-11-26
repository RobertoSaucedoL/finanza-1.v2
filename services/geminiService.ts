import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentConfig } from "../types";

// Helper para obtener el cliente de forma segura
const getClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("🔑 API Key no encontrada en import.meta.env.VITE_API_KEY");
    throw new Error("API Key no configurada");
  }
  
  console.log("🔑 API Key detectada (empieza con):", apiKey.substring(0, 6) + "...");
  return new GoogleGenerativeAI(apiKey);
};

// Crear sesión de chat
export const createChatSession = (config: AgentConfig) => {
  try {
    const genAI = getClient();
    console.log("🤖 Inicializando chat con modelo:", config.model);
    
    const model = genAI.getGenerativeModel({ 
      model: config.model,
      systemInstruction: config.systemInstruction,
    });
    
    const tools = config.useSearch ? [{ googleSearch: {} }] : undefined;
    
    return model.startChat({
      history: [],
      generationConfig: {
        temperature: config.temperature,
      },
      tools: tools,
    });
  } catch (error) {
    console.error("❌ Error al crear la sesión de chat:", error);
    throw error;
  }
};

// Enviar mensaje con streaming
export async function* streamMessage(chat: any, message: string) {
  try {
    if (!message || !message.trim()) {
      throw new Error("Mensaje vacío, no se puede enviar a Gemini");
    }

    console.log("📤 Enviando mensaje:", message);

    // 👇 CAMBIO IMPORTANTE: mandamos partes [{ text: message }]
    const result = await chat.sendMessageStream([
      { text: message }
    ]);

    for await (const chunk of result.stream) {
      try {
        const chunkText = chunk.text();
        console.log("📨 Chunk recibido");

        yield {
          text: chunkText,
          groundingChunks:
            chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        };
      } catch (chunkError) {
        console.warn("⚠️ Error procesando chunk:", chunkError);
      }
    }

    console.log("✅ Stream completado");
  } catch (error) {
    console.error("❌ Error en stream:", error);
    throw error;
  }
}

// Análisis de datos financieros
export const analyzeFinancialData = async (data: string) => {
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analiza los siguientes datos financieros: ${data}`;
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  } catch (error) {
    console.error("Error al analizar datos:", error);
    throw error;
  }
};

export default { createChatSession, streamMessage, analyzeFinancialData };
