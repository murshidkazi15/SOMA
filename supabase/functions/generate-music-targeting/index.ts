// Lovable AI gateway call to produce a music targeting plan from current/target state.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildPrompt = (currentState: string, targetState: string) => `You are a computational neuroscientist specializing in music cognition and cortical response modeling. You have deep knowledge of how specific musical features map to neural activation patterns based on published fMRI and EEG research.

Current mental state: "${currentState}"
Target mental state: "${targetState}"

Your job is to:
1. Design a music intervention that bridges these two states
2. Score it based on actual neuroscience of how that music type affects the brain

NEUROSCIENCE SCORING RULES — apply these strictly:

ATTENTION (prefrontal cortex / dorsal attention network):
- High (70-95): complex rhythmic patterns, syncopation, unexpected harmonic changes, fast BPM 120+, electronic/techno/drum and bass
- Medium (40-70): moderate complexity, steady groove, pop/rock/hip-hop with hooks
- Low (10-40): drone, ambient, minimal, slow repetitive patterns, nature sounds, binaural beats
- Note: attention DROPS with very familiar or predictable music

FOCUS (sustained attention / theta waves 4-8Hz):
- High (70-95): binaural beats in theta range, lo-fi hip hop, steady 60-80 BPM, minimal lyrics, instrumental only
- Medium (40-70): classical, jazz, moderate tempo instrumental
- Low (10-40): high energy dance, lyrics with complex narratives, tempo changes, live concert recordings
- Note: focus is INVERSELY related to emotional arousal above a threshold

MOTIVATION (dopaminergic reward / nucleus accumbens):
- High (70-95): major key, rising chord progressions, strong beat, BPM 100-140, uplifting electronic, anthemic pop
- Medium (40-70): neutral/mixed mode, moderate energy, consistent groove
- Low (10-40): minor key, slow tempo, ambient, atonal, dissonant
- Note: motivation spikes at musical climaxes and drops

COMFORT (default mode network / parasympathetic):
- High (70-95): major key, consonant harmonies, slow-medium tempo 60-80 BPM, warm timbres (piano, strings, acoustic guitar), predictable structure
- Medium (40-70): familiar genres, moderate complexity, balanced dynamics
- Low (10-40): dissonance, unpredictable structure, harsh timbres, very high or very low BPM extremes
- Note: comfort correlates strongly with musical familiarity and consonance

RESISTANCE (anterior insula / cognitive load — LOWER IS BETTER):
- High (60-90): overly complex, jarring transitions, mismatched genre for context, very loud, lyrics demanding attention
- Medium (30-60): moderate complexity, some unfamiliarity
- Low (5-30): simple structure, familiar genre, gentle dynamics, matches current emotional state

BASELINE SCORES (current state before music):
Derive these from the user's described current state:
- "stressed/anxious": attention 25-35, focus 20-30, motivation 30-40, comfort 20-30, resistance 65-80
- "tired/low energy": attention 15-25, focus 15-25, motivation 20-30, comfort 45-55, resistance 40-55
- "neutral/okay": attention 40-55, focus 40-55, motivation 40-55, comfort 50-65, resistance 30-45
- "focused already": attention 65-75, focus 60-70, motivation 55-65, comfort 55-65, resistance 20-30
- Interpolate for mixed states

MUSIC PROMPT RULES:
- Be extremely specific: exact BPM, key signature, specific instruments, production style, energy arc
- The music must actually be capable of producing the target scores you assign
- If you score attention LOW, the music must be ambient/minimal — not techno
- If you score focus HIGH, the music must be steady tempo instrumental — not lyrical pop
- Scores must be internally consistent with the music described

IMPORTANT: Never return the same scores for different music types. A 68 BPM ambient piano piece and a 128 BPM techno track must have dramatically different score profiles.

Return ONLY valid JSON:
{
  "musicgen_prompt": "extremely specific music description matching the scores below — BPM, key, instruments, production style, energy arc, 40 words max, no lyrics, instrumental only",
  "track_name": "two evocative words that capture the music's neural effect",
  "track_subtitle": "Genre · 00:30",
  "bpm": number,
  "genre": "specific genre",
  "neural_target": "primary brain region targeted e.g. Prefrontal Engagement, Theta Induction, Dopaminergic Activation",
  "scores": {
    "attention": number,
    "focus": number,
    "motivation": number,
    "comfort": number,
    "resistance": number
  },
  "baseline_scores": {
    "attention": number,
    "focus": number,
    "motivation": number,
    "comfort": number,
    "resistance": number
  },
  "activated_regions": [
    {
      "name": "region name from: Prefrontal Cortex, Auditory Cortex, Superior Temporal, Inferior Frontal, Motor Cortex, Hippocampus, Anterior Cingulate, Insula",
      "intensity": number 0-100,
      "color": "hex color matching region type: Prefrontal=#7c3aed, Auditory=#ff2d78, Superior Temporal=#00d4ff, Inferior Frontal=#e040fb, Motor Cortex=#f5a623, Hippocampus=#00ff9d, Anterior Cingulate=#448aff, Insula=#ff6b35",
      "position": {
        "left": "percentage within range for this region",
        "top": "percentage within range for this region"
      }
    }
  ],
  "match_score": number,
  "science_note": "one sentence explaining the primary neuroscience mechanism e.g. Theta binaural beats entrain hippocampal-prefrontal circuits associated with sustained attention"
}

Position ranges:
Prefrontal Cortex: left 34-40%, top 34-41%
Inferior Frontal: left 33-39%, top 47-54%
Motor Cortex: left 47-53%, top 25-32%
Anterior Cingulate: left 46-52%, top 29-36%
Auditory Cortex: left 40-46%, top 50-57%
Superior Temporal: left 46-52%, top 55-62%
Hippocampus: left 53-59%, top 57-63%
Insula: left 40-46%, top 47-54%`;

const trace = (traceId: string, event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ traceId, fn: "generate-music-targeting", event, ts: Date.now(), ...data }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Health check
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({
        ok: true,
        function: "generate-music-targeting",
        hasLovableApiKey: !!Deno.env.get("LOVABLE_API_KEY"),
        ts: Date.now(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const traceId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const body = await req.json();
    const { currentText, targetText, currentMoods, targetMoods } = body;
    trace(traceId, "request_received", {
      currentMoods: currentMoods ?? [],
      targetMoods: targetMoods ?? [],
      currentTextLen: currentText?.length ?? 0,
      targetTextLen: targetText?.length ?? 0,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      trace(traceId, "missing_api_key");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentMoodsStr = (currentMoods ?? []).join(", ");
    const targetMoodsStr = (targetMoods ?? []).join(", ");
    const currentState = [currentMoodsStr, currentText ?? ""].filter(Boolean).join(" — ");
    const targetState = [targetMoodsStr, targetText ?? ""].filter(Boolean).join(" — ");

    const fullPrompt = buildPrompt(currentState, targetState);

    trace(traceId, "ai_gateway_call_start");
    const aiT0 = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: fullPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_targeting_plan",
              description: "Emit the neural music targeting plan.",
              parameters: {
                type: "object",
                properties: {
                  musicgen_prompt: { type: "string" },
                  track_name: { type: "string" },
                  track_subtitle: { type: "string" },
                  bpm: { type: "number" },
                  genre: { type: "string" },
                  neural_target: { type: "string" },
                  baseline_scores: {
                    type: "object",
                    properties: {
                      attention: { type: "number" },
                      focus: { type: "number" },
                      motivation: { type: "number" },
                      comfort: { type: "number" },
                      resistance: { type: "number" },
                    },
                    required: ["attention", "focus", "motivation", "comfort", "resistance"],
                    additionalProperties: false,
                  },
                  scores: {
                    type: "object",
                    properties: {
                      attention: { type: "number" },
                      focus: { type: "number" },
                      motivation: { type: "number" },
                      comfort: { type: "number" },
                      resistance: { type: "number" },
                    },
                    required: ["attention", "focus", "motivation", "comfort", "resistance"],
                    additionalProperties: false,
                  },
                  match_score: { type: "number" },
                  science_note: { type: "string" },
                  activated_regions: {
                    type: "array",
                    minItems: 3,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        intensity: { type: "number" },
                        position: {
                          type: "object",
                          properties: {
                            left: { type: "string" },
                            top: { type: "string" },
                          },
                          required: ["left", "top"],
                          additionalProperties: false,
                        },
                        color: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["name", "intensity", "position", "color"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["musicgen_prompt", "track_name", "track_subtitle", "bpm", "genre", "neural_target", "baseline_scores", "scores", "match_score", "science_note", "activated_regions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_targeting_plan" } },
      }),
    });
    trace(traceId, "ai_gateway_call_end", { status: response.status, durationMs: Date.now() - aiT0 });

    if (!response.ok) {
      const text = await response.text();
      trace(traceId, "ai_gateway_error", { status: response.status, body: text.slice(0, 500) });
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly.", traceId }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", traceId }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text, traceId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      trace(traceId, "no_tool_call", { response: JSON.stringify(data).slice(0, 500) });
      return new Response(JSON.stringify({ error: "Model did not return a structured plan", traceId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(toolCall.function.arguments);
    trace(traceId, "success", {
      totalDurationMs: Date.now() - t0,
      track_name: plan.track_name,
      bpm: plan.bpm,
      match_score: plan.match_score,
    });
    return new Response(JSON.stringify({ ...plan, traceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    trace(traceId, "exception", { message: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", traceId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
