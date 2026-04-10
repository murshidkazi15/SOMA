// Lyria 3 Clip edge function. Calls Google Generative Language API and returns a base64 audio data URL.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_AUDIO_URL = "/demo-track.mp3";

const trace = (traceId: string, event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ traceId, fn: "generate-lyria", event, ts: Date.now(), ...data }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({
        ok: true,
        function: "generate-lyria",
        hasGeminiKey: !!Deno.env.get("GEMINI_API_KEY"),
        ts: Date.now(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const traceId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      trace(traceId, "missing_key");
      return new Response(
        JSON.stringify({ audioUrl: FALLBACK_AUDIO_URL, fallback: true, fallbackReason: "GEMINI_API_KEY not configured", traceId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { prompt, fallbackOnError = true } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'prompt' string in request body", traceId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    trace(traceId, "request_received", { promptLen: prompt.length });

    const enhancedMusicPrompt = `${prompt}. Instrumental only, no vocals, no lyrics. High fidelity studio production. Seamless loop-ready 30 second composition.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${GEMINI_API_KEY}`;

    trace(traceId, "lyria_call_start", { enhancedPromptLen: enhancedMusicPrompt.length });
    const callT0 = Date.now();
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedMusicPrompt }] }],
        generationConfig: { temperature: 1.0 },
      }),
    });
    trace(traceId, "lyria_call_end", { status: res.status, durationMs: Date.now() - callT0 });

    if (!res.ok) {
      const text = await res.text();
      trace(traceId, "lyria_call_failed", { status: res.status, body: text.slice(0, 500) });
      if (fallbackOnError) {
        return new Response(
          JSON.stringify({ audioUrl: FALLBACK_AUDIO_URL, fallback: true, fallbackReason: `Lyria HTTP ${res.status}`, upstreamStatus: res.status, detail: text.slice(0, 500), traceId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "Lyria call failed", detail: text, traceId }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p: any) => p?.inlineData?.mimeType?.startsWith?.("audio/"));
    const textPart = parts.find((p: any) => typeof p?.text === "string" && p.text.length > 0);

    if (!audioPart?.inlineData?.data) {
      trace(traceId, "no_audio_in_response", { partKeys: parts.map((p: any) => Object.keys(p ?? {})) });
      if (fallbackOnError) {
        return new Response(
          JSON.stringify({ audioUrl: FALLBACK_AUDIO_URL, fallback: true, fallbackReason: "No audio in Lyria response", traceId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "No audio in Lyria response", traceId }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mimeType = audioPart.inlineData.mimeType || "audio/mp3";
    const dataUrl = `data:${mimeType};base64,${audioPart.inlineData.data}`;

    trace(traceId, "success", { totalDurationMs: Date.now() - t0, hasText: !!textPart, mimeType });
    return new Response(
      JSON.stringify({ audioUrl: dataUrl, lyrics: textPart?.text ?? null, traceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    trace(traceId, "exception", { message: e instanceof Error ? e.message : String(e) });
    return new Response(
      JSON.stringify({ audioUrl: FALLBACK_AUDIO_URL, fallback: true, fallbackReason: e instanceof Error ? e.message : "Unknown error", traceId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
