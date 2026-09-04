import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, createCheckoutSessionUrl } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You need to be logged in to upgrade." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { priceId } = body;

    const validPriceIds = [PLANS.unlimited.monthly.priceId, PLANS.unlimited.yearly.priceId];

    if (!priceId || typeof priceId !== "string" || !validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: "A valid price ID is required." },
        { status: 400 }
      );
    }

    const url = await createCheckoutSessionUrl({
      supabase,
      userId: user.id,
      userEmail: user.email,
      priceId,
      baseUrl: getBaseUrl(req.headers),
    });

    if (!url) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[create-checkout-session]", err);
    return NextResponse.json(
      { error: "Something went sideways. Let's try that again." },
      { status: 500 }
    );
  }
}
