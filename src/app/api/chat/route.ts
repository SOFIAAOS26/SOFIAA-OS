import { NextRequest, NextResponse } from "next/server";
import { SOFIAA_PROMPT_KERNEL } from "@/config/system.prompt";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key no configurada" }, { status: 500 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SOFIAA_PROMPT_KERNEL },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API Error:", err);
      return NextResponse.json({ error: "Error del modelo IA" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "Sin respuesta";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("SOFIAA API Error:", error);
    return NextResponse.json({ error: "Error interno del sistema" }, { status: 500 });
  }
}
