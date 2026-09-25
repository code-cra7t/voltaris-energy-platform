interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export async function geminiJson<T>(prompt: string): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
  for (const [index, model] of [...new Set([primary, fallback])].entries()) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const data = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      if ((response.status === 429 || response.status === 503) && index === 0 && primary !== fallback) {
        continue;
      }
      throw new Error(`Gemini request failed: ${data.error?.message || response.status}`);
    }
    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!raw) throw new Error("Gemini returned no structured response");
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error("Gemini returned invalid JSON");
    }
  }
  throw new Error("No Gemini model is available");
}
