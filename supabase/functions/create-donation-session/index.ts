import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    const stripeKey = Deno.env.get("STRIPE_CHECKOUT_KEY");
    console.log("STRIPE_CHECKOUT_KEY prefix:", stripeKey?.substring(0, 12), "length:", stripeKey?.length);
    if (!stripeKey) {
      throw new Error("STRIPE_CHECKOUT_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { amount, currency, recurring, successUrl, cancelUrl } = await req.json();

    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100) {
      return new Response(JSON.stringify({ error: "Minimum donation is 1.00" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
