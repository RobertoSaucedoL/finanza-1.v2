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
    
    const chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: 1000,
      },
      tools: tools,
    });

    console.log("✅ Sesión de chat creada exitosamente");
    return chat;
  } catch (error) {
    console.error("❌ Error al crear la sesión de chat:", error);
    throw error;
  }
};

// Enviar mensaje con streaming - VERSIÓN CORREGIDA
export async function* streamMessage(chat: any, message: string) {
  try {
    if (!message || !message.trim()) {
      throw new Error("Mensaje vacío, no se puede enviar a Gemini");
    }

    console.log("📤 Enviando mensaje a Gemini:", message.substring(0, 100) + "...");

    // 👇 FORMATO ABSOLUTAMENTE CORRECTO para Gemini
    // La API espera un objeto con la estructura específica
    const result = await chat.sendMessageStream(message);

    console.log("📨 Respuesta recibida, iniciando stream...");

    let receivedChunks = 0;
    
    for await (const chunk of result.stream) {
      receivedChunks++;
      try {
        const chunkText = chunk.text();
        console.log(`📦 Chunk ${receivedChunks}:`, chunkText?.substring(0, 50) + "...");

        yield {
          text: chunkText || "",
          groundingChunks: chunk.groundingMetadata?.groundingChunks || [],
        };
      } catch (chunkError) {
        console.warn("⚠️ Error procesando chunk:", chunkError);
        continue;
      }
    }

    console.log(`✅ Stream completado. Chunks recibidos: ${receivedChunks}`);

  } catch (error: any) {
    console.error("❌ Error crítico en stream:", error);
    
    // Análisis detallado del error
    if (error.message?.includes("ContentUnion")) {
      console.error("🔍 Problema de formato ContentUnion detectado");
      throw new Error("Error de formato en el mensaje (ContentUnion). La API de Gemini cambió recientemente.");
    }
    
    if (error.message?.includes("API key")) {
      throw new Error("Problema con la API Key. Verifica que sea válida y tenga permisos.");
    }
    
    throw new Error(`Error al comunicarse con Gemini: ${error.message}`);
  }
}

// Versión alternativa sin streaming (fallback robusto)
export const sendMessageSimple = async (chat: any, message: string) => {
  try {
    console.log("🔄 Usando método simple para mensaje:", message.substring(0, 100) + "...");
    
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    console.log("✅ Respuesta simple recibida");
    return response.text();
  } catch (error: any) {
    console.error("❌ Error en método simple:", error);
    
    // Intentar con generateContent como último recurso
    try {
      console.log("🔄 Intentando con generateContent...");
      const genAI = getClient();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(message);
      return result.response.text();
    } catch (finalError) {
      throw new Error(`No se pudo procesar el mensaje: ${error.message}`);
    }
  }
};

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

export default { 
  createChatSession, 
  streamMessage, 
  sendMessageSimple,
  analyzeFinancialData 
};
