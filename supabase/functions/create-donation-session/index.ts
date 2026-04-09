import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    // Log key prefix for debugging (safe — only first 12 chars)
    console.log("STRIPE key prefix:", STRIPE_SECRET_KEY.substring(0, 12), "length:", STRIPE_SECRET_KEY.length);

    const { amount, currency, recurring, successUrl, cancelUrl } = await req.json();

    // Validate
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100) {
      return new Response(JSON.stringify({ error: "Minimum donation is 1.00" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cur = (currency || "eur").toLowerCase();
    const isRecurring = recurring === true;

    // Build line item
    const lineItem: Record<string, unknown> = {
      quantity: 1,
      price_data: {
        currency: cur,
        product_data: { name: isRecurring ? "Monthly Donation — NewsFriend" : "Donation — NewsFriend" },
        unit_amount: cents,
        ...(isRecurring ? { recurring: { interval: "month" } } : {}),
      },
    };

    const bodyParams = new URLSearchParams();
    bodyParams.append("mode", isRecurring ? "subscription" : "payment");
    bodyParams.append("success_url", successUrl || "https://newsfriend.lovable.app/support?success=true");
    bodyParams.append("cancel_url", cancelUrl || "https://newsfriend.lovable.app/support?cancelled=true");
    bodyParams.append("line_items[0][quantity]", "1");
    bodyParams.append("line_items[0][price_data][currency]", cur);
    bodyParams.append("line_items[0][price_data][product_data][name]",
      isRecurring ? "Monthly Donation — NewsFriend" : "Donation — NewsFriend");
    bodyParams.append("line_items[0][price_data][unit_amount]", String(cents));
    if (isRecurring) {
      bodyParams.append("line_items[0][price_data][recurring][interval]", "month");
    }
    if (!isRecurring) {
      bodyParams.append("submit_type", "donate");
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", JSON.stringify(session));
      return new Response(JSON.stringify({ error: session.error?.message || "Stripe error" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error creating donation session:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
