type AuthProviderEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "PASSWORD_RECOVERY"
  | "USER_UPDATED"
  | "MFA_CHALLENGE_VERIFIED";

interface ApplyAuthProviderEventArgs {
  event: AuthProviderEvent;
  session: unknown;
  setLoading: (loading: boolean) => void;
  refresh: () => void;
  replace: (href: string) => void;
  signOut: () => Promise<unknown>;
}

export async function applyAuthProviderEvent({
  event,
  session,
  setLoading,
  refresh,
  replace,
  signOut,
}: ApplyAuthProviderEventArgs): Promise<void> {
  if (event === "TOKEN_REFRESHED" && !session) {
    await signOut();
  }

  if (event === "SIGNED_IN") {
    refresh();
  }

  if (event === "SIGNED_OUT") {
    replace("/login");
  }

  setLoading(false);
}
