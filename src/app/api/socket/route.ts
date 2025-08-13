import { genAI, MODEL_NAME, SYSTEM_PROMPT } from "@/lib/gemini-config";
import { WebSocket } from "ws";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_API_KEY) {
    return new NextResponse("Missing API key", { status: 500 });
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });

    // Initialize chat with system prompt
    await chat.sendMessage(SYSTEM_PROMPT);

    const { searchParams } = new URL(request.url);
    const socket = new WebSocket(searchParams.get("socket") || "");

    socket.on("message", async (data) => {
      const message = data.toString();
      
      try {
        const response = await chat.sendMessage(message);
        const content = await response.response.text();
        socket.send(JSON.stringify({ type: "text", content }));
      } catch (error) {
        console.error("Error processing message:", error);
        socket.send(JSON.stringify({ type: "error", content: "Error processing your message" }));
      }
    });

    return new NextResponse("WebSocket connection established", { status: 200 });
  } catch (error) {
    console.error("Error initializing chat:", error);
    return new NextResponse("Error initializing chat", { status: 500 });
  }
}
