import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY no está configurada en las variables de entorno");
  }
  
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeFinancialData = async (data: string) => {
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analiza los siguientes datos financieros: ${data}`;
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  } catch (error) {
    console.error("Error al analizar datos:", error);
    throw error;
  }
};

export default { analyzeFinancialData };
