import { createServerFn } from "@tanstack/react-start";

type Field =
  | "skills"
  | "interests"
  | "availability"
  | "location"
  | "experience"
  | "focus_area"
  | "required_skills"
  | "description"
  | "search";

interface Input {
  field: Field;
  context?: string;
  role?: "volunteer" | "ngo";
}

const FIELD_PROMPTS: Record<Field, string> = {
  skills: "Suggest 8 concise, professional volunteer skills (1-3 words each) relevant to the context.",
  interests: "Suggest 8 concise cause/interest areas (1-3 words each) a volunteer might care about, relevant to context.",
  availability: "Suggest 5 realistic availability descriptions (e.g. 'Weekends, ~5 hrs/wk').",
  location: "Suggest 6 plausible city or region names based on the context. If no hint, use popular metros.",
  experience: "Write ONE concise 2-3 sentence sample experience blurb for a volunteer profile based on context. Return as a single item.",
  focus_area: "Suggest 8 NGO focus areas (e.g. Education, Climate, Health) relevant to context.",
  required_skills: "Suggest 8 concise skills (1-3 words each) an NGO would require from volunteers for the given opportunity.",
  description: "Write ONE polished 3-4 sentence opportunity description based on the title/context. Return as a single item.",
  search: "Suggest 6 short search queries a user might try to discover volunteer opportunities in the given interest area.",
};

export const getAISuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const instruction = FIELD_PROMPTS[data.field];
    const roleLine = data.role ? `User role: ${data.role}.` : "";
    const ctxLine = data.context ? `Context: ${data.context}` : "No specific context provided.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a smart assistant for an NGO-volunteer matching platform called Impact Link. Return ONLY valid JSON matching the schema — no prose, no markdown.",
          },
          {
            role: "user",
            content: `${roleLine}\n${ctxLine}\n\nTask: ${instruction}\n\nRespond as JSON: { "items": string[] }`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      throw new Error(`AI error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed.items) ? parsed.items.map((s: unknown) => String(s)).filter(Boolean) : [];
      return { items };
    } catch {
      return { items: [] };
    }
  });
