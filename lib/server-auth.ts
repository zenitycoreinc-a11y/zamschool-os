import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  buildActorContext,
  type ActorContext,
  type KnownRole,
} from "@/lib/server-auth-core";

export { buildActorContext, normalizeRole } from "@/lib/server-auth-core";

function readBearerToken(req?: Request) {
  const header = req?.headers.get("authorization") || req?.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme || "") || !token) {
    return "";
  }

  return token.trim();
}

async function getAuthenticatedUser(req?: Request) {
  const bearerToken = readBearerToken(req);
  if (bearerToken !== null) {
    if (!bearerToken) {
      return {
        user: null,
        authError: new Error("Invalid authorization header"),
      };
    }

    const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
    return {
      user: data.user,
      authError: error,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    authError: error,
  };
}

function jsonError(result: { status: 401 | 403; error: string }) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function requireActorContext(options: {
  allowedRoles: KnownRole[];
  requireSchool: boolean;
  allowMetadataRoleFallback?: boolean;
}, req?: Request): Promise<
  | {
      ok: false;
      response: NextResponse;
    }
  | {
      ok: true;
      context: ActorContext;
    }
> {
  const { user, authError } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return {
      ok: false as const,
      response: jsonError({
        status: 401,
        error: "Unauthorized",
      }),
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .maybeSingle();

  const result = buildActorContext({
    user,
    profile,
    allowedRoles: options.allowedRoles,
    requireSchool: options.requireSchool,
    allowMetadataRoleFallback: options.allowMetadataRoleFallback,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      response: jsonError(result),
    };
  }

  return {
    ok: true as const,
    context: result,
  };
}

export async function requireAdminContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["ADMIN"],
    requireSchool: true,
  }, req);
}

export async function requireAdminSetupContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["ADMIN"],
    requireSchool: false,
    allowMetadataRoleFallback: true,
  }, req);
}

export async function requireTeacherContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["TEACHER"],
    requireSchool: true,
  }, req);
}

export async function requireStudentContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["STUDENT"],
    requireSchool: true,
  }, req);
}

export async function requireParentContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["PARENT"],
    requireSchool: true,
  }, req);
}

export async function requirePaymentsContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["PAYMENTS"],
    requireSchool: true,
  }, req);
}

export async function requireTeacherOrParentContext(req?: Request) {
  return requireActorContext({
    allowedRoles: ["TEACHER", "PARENT"],
    requireSchool: true,
  }, req);
}

