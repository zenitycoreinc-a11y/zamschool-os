import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { safeErrorMessage } from "../../../../lib/server-guards";
import { clearFirstLoginState, FirstLoginError } from "../../../../lib/first-login";

export async function POST(req: Request) {
  try {
    const bearerToken = readBearerToken(req);
    if (!bearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    const metadataRequiresChange = user.user_metadata?.must_change_password === true;

    if (profileError && !isMissingColumnError(profileError)) {
      throw profileError;
    }

    const profileRequiresChange =
      profile && typeof profile.must_change_password === "boolean"
        ? profile.must_change_password === true
        : null;

    if (profileRequiresChange !== true && metadataRequiresChange !== true) {
      return NextResponse.json(
        { error: "Password change is not required." },
        { status: 409 }
      );
    }

    await clearFirstLoginState({
      adminClient: supabaseAdmin,
      userId: user.id,
      userMetadata: user.user_metadata || {},
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof FirstLoginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to complete first login") },
      { status: 500 }
    );
  }
}

function isMissingColumnError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("does not exist");
}

function readBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}
