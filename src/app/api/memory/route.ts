import { NextRequest, NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const { messages }: { messages: Message[] } = await req.json();

  if (!messages || messages.length < 2) {
    return NextResponse.json({ memory: null });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ memory: null });

  const conversation = messages
    .map((m) => `${m.role === "user" ? "Usuario" : "SOFIAA"}: ${m.content}`)
    .join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: `Eres un extractor de memoria. Analiza la conversación y extrae en 3 oraciones máximo los hechos más importantes sobre el usuario: su nombre, sus proyectos, sus intereses, sus necesidades o cualquier dato personal que haya compartido. Solo incluye información que el usuario mencionó explícitamente. Sé muy conciso. Si no hay información relevante sobre el usuario, responde exactamente: "sin datos".`,
        },
        {
          role: "user",
          content: conversation,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  if (!response.ok) return NextResponse.json({ memory: null });

  const data = await response.json();
  const memory = data.choices?.[0]?.message?.content ?? null;

  if (!memory || memory.trim() === "sin datos") {
    return NextResponse.json({ memory: null });
  }

  return NextResponse.json({ memory: memory.trim() });
}
