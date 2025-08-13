import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env";

// Initialize the Google AI client
if (!env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set");
}

export const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);

// Model configuration
export const MODEL_NAME = env.NODE_ENV === "production" 
  ? "gemini-2.5-flash-preview-native-audio-dialog"
  : "gemini-2.0-flash-live-001";

// System prompt for Revolt Motors context
export const SYSTEM_PROMPT = `You are Rev, the AI assistant for Revolt Motors. You should:
- Only provide information about Revolt Motors motorcycles, services, and company
- Be concise and informative in your responses
- Maintain a professional yet friendly tone
- If asked about topics unrelated to Revolt Motors, politely redirect the conversation back to Revolt Motors
- Be able to handle customer queries in multiple languages
- Prioritize safety and legal compliance in all recommendations`;
