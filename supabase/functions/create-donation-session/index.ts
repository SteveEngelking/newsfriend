import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DonationSessionResponse {
  ok: boolean;
  data?: {
    url: string;
  };
  error?: string;
}

const respond = (payload: DonationSessionResponse) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_CHECKOUT_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_CHECKOUT_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return respond({ ok: false, error: "Invalid request body" });
    }

    const { amount, currency, recurring, successUrl, cancelUrl } = body;

    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100) {
      return respond({ ok: false, error: "Minimum donation is 1.00" });
    }

    const cur = (currency || "eur").toLowerCase();
    const isRecurring = recurring === true;

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: cur,
            product_data: {
              name: isRecurring ? "Monthly Donation — NewsFriend" : "Donation — NewsFriend",
            },
            unit_amount: cents,
            ...(isRecurring ? { recurring: { interval: "month" } } : {}),
          },
        },
      ],
      mode: isRecurring ? "subscription" : "payment",
      ...(!isRecurring ? { submit_type: "donate" } : {}),
      success_url: successUrl || "https://newsfriend.lovable.app/support?success=true",
      cancel_url: cancelUrl || "https://newsfriend.lovable.app/support?cancelled=true",
    });

    if (!session.url) {
      return respond({ ok: false, error: "No checkout URL returned by Stripe" });
    }

    return respond({ ok: true, data: { url: session.url } });
  } catch (err) {
    console.error("Error creating donation session:", err);

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return respond({ ok: false, error: errorMessage });
  }
});
