"use client";

import { fetchWithOfflineSupport } from "@/lib/offline-fetch";
import { supabase } from "@/lib/supabase";

export async function adminApiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Authorization")) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return fetchWithOfflineSupport(input, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
  });
}

export async function adminApiJson<T = any>(input: string, init: RequestInit = {}) {
  const response = await adminApiFetch(input, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  return body as T;
}
