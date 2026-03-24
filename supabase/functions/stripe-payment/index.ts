/**
 * Supabase Edge Function: stripe-payment
 *
 * Body JSON:
 * - { "action": "create-intent", "reservation_id": "<uuid>" }
 *   (buyer must own reservation, or admin/super_admin for any pending reservation)
 * - { "action": "sync-intent", "payment_intent_id": "pi_..." }
 *   (same auth rule; completes payment via RPC service_role)
 *
 * Secrets (Edge Functions — Project Settings → Edge Functions → Secrets, o CLI):
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PUBLISHABLE_KEY=pk_test_...
 *
 * También se aceptan alias (por si los nombraste así en el panel):
 * - sk  → misma función que STRIPE_SECRET_KEY
 * - pk  → misma función que STRIPE_PUBLISHABLE_KEY
 *
 * Nota: los secretos del "Vault" de la base NO son lo mismo; las funciones solo ven
 * variables configuradas para Edge Functions.
 *
 * Deploy: supabase functions deploy stripe-payment --no-verify-jwt
 * (JWT verified manually via getUser + reservation ownership.)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/** Stripe secret: canonical name or short alias `sk` (some teams use Vault-style names). */
const STRIPE_SECRET_KEY =
  (Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("sk") ?? "").trim();
/** Publishable key for Elements: canonical or alias `pk`. */
const STRIPE_PUBLISHABLE_KEY = (
  Deno.env.get("STRIPE_PUBLISHABLE_KEY") ??
  Deno.env.get("pk") ??
  ""
).trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      ...(init.headers ?? {}),
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, { status: 204 });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!stripe) {
    return jsonResponse(
      {
        error:
          "Stripe is not configured: set STRIPE_SECRET_KEY (or alias sk) for Edge Functions, then redeploy stripe-payment.",
      },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid session" }, { status: 401 });
  }

  let body: { action?: string; reservation_id?: string; payment_intent_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;

  const { data: actorProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const actorRole = actorProfile?.role as string | undefined;
  const isPrivilegedStaff =
    actorRole === "admin" || actorRole === "super_admin";

  try {
    if (action === "create-intent") {
      const rid = body.reservation_id;
      if (!rid) {
        return jsonResponse({ error: "reservation_id required" }, { status: 400 });
      }

      const { data: row, error: qerr } = await adminClient
        .from("reservations")
        .select("id, buyer_id, status, total_amount, currency_code, public_reference")
        .eq("id", rid)
        .maybeSingle();

      if (qerr || !row) {
        return jsonResponse({ error: "Reservation not found" }, { status: 404 });
      }
      if (row.buyer_id !== user.id && !isPrivilegedStaff) {
        return jsonResponse({ error: "Forbidden" }, { status: 403 });
      }
      if (row.status !== "pending") {
        return jsonResponse({ error: "Reservation is not pending payment" }, { status: 400 });
      }
      if (!row.total_amount || row.total_amount <= 0) {
        return jsonResponse({ error: "Invalid amount" }, { status: 400 });
      }

      const currency = String(row.currency_code ?? "usd").toLowerCase();
      const pi = await stripe.paymentIntents.create({
        amount: row.total_amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          reservation_id: row.id,
          buyer_id: row.buyer_id,
          initiated_by: user.id,
          public_reference: row.public_reference ?? "",
        },
      });

      return jsonResponse({
        client_secret: pi.client_secret,
        publishable_key: STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: pi.id,
      });
    }

    if (action === "sync-intent") {
      const piid = body.payment_intent_id;
      if (!piid) {
        return jsonResponse({ error: "payment_intent_id required" }, { status: 400 });
      }

      const pi = await stripe.paymentIntents.retrieve(piid);
      if (pi.status !== "succeeded") {
        return jsonResponse(
          { error: "Payment not completed yet", status: pi.status },
          { status: 400 },
        );
      }

      const rid = pi.metadata?.reservation_id;
      if (!rid) {
        return jsonResponse({ error: "Missing reservation metadata on PaymentIntent" }, { status: 400 });
      }

      const { data: row, error: qerr } = await adminClient
        .from("reservations")
        .select("id, buyer_id, status, total_amount, currency_code")
        .eq("id", rid)
        .maybeSingle();

      if (qerr || !row) {
        return jsonResponse({ error: "Reservation not found" }, { status: 404 });
      }
      if (row.buyer_id !== user.id && !isPrivilegedStaff) {
        return jsonResponse({ error: "Forbidden" }, { status: 403 });
      }

      const expectedCents = row.total_amount ?? 0;
      if (Number(pi.amount) !== Number(expectedCents)) {
        return jsonResponse({ error: "Amount mismatch" }, { status: 400 });
      }

      const cur = String(row.currency_code ?? "USD").toUpperCase();
      const piCur = String(pi.currency ?? "usd").toUpperCase();
      if (piCur !== cur) {
        return jsonResponse({ error: "Currency mismatch" }, { status: 400 });
      }

      const { data: rpcData, error: rpcErr } = await adminClient.rpc(
        "complete_reservation_payment_from_gateway",
        {
          p_reservation_id: rid,
          p_payment_intent_id: pi.id,
          p_amount_cents: expectedCents,
          p_currency: cur,
        },
      );

      if (rpcErr) {
        return jsonResponse({ error: rpcErr.message }, { status: 500 });
      }

      const payload = rpcData as { success?: boolean; error?: string } | null;
      if (payload && payload.success === false) {
        return jsonResponse({ error: payload.error ?? "Could not complete payment" }, { status: 400 });
      }

      return jsonResponse({ success: true, data: rpcData });
    }

    return jsonResponse({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return jsonResponse({ error: msg }, { status: 500 });
  }
});
