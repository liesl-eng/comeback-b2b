import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CatalogOrderSchema = z.object({
  kind: z.literal("catalog_order"),
  company_name: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  order_items: z.string().max(20000),
  total_items: z.string().max(20),
  order_total: z.string().max(40),
  timestamp: z.string().max(60),
});

const EmailCaptureSchema = z.object({
  kind: z.literal("email_capture"),
  email: z.string().trim().email().max(255),
  source: z.string().trim().max(120),
  timestamp: z.string().max(60),
});

const Schema = z.discriminatedUnion("kind", [
  CatalogOrderSchema,
  EmailCaptureSchema,
]);

// Simple in-memory rate limit (per cold-start instance): 1 req / 30s per IP+kind.
const lastSeen = new Map<string, number>();
const WINDOW_MS = 30_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const prev = lastSeen.get(key);
  if (prev && now - prev < WINDOW_MS) return true;
  lastSeen.set(key, now);
  if (lastSeen.size > 5000) {
    for (const [k, t] of lastSeen) {
      if (now - t > WINDOW_MS) lastSeen.delete(k);
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const data = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`${ip}:${data.kind}`)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetUrl =
    data.kind === "catalog_order"
      ? Deno.env.get("MAKE_CATALOG_ORDER_WEBHOOK_URL")
      : Deno.env.get("MAKE_EMAIL_CAPTURE_WEBHOOK_URL");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "webhook_not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Strip the discriminator before forwarding so Make.com receives the original shape.
  const { kind: _omit, ...forwardPayload } = data as Record<string, unknown>;

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardPayload),
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "upstream_error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "upstream_unreachable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
