"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { applyAuthProviderEvent } from "@/lib/auth-provider-events";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    console.info("[AuthProvider.useEffect()] Mounting auth provider");

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        console.info("[AuthProvider.useEffect()] Initial client session snapshot", {
          hasSession: Boolean(data.session),
          userId: data.session?.user?.id || null,
          role:
            data.session?.user?.user_metadata?.role ||
            data.session?.user?.app_metadata?.role ||
            null,
          error: error?.message || null,
        });

        if (error) {
          console.warn("[AuthProvider.useEffect()] Initial client session lookup failed", {
            message: error.message,
          });
        }

        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;

        console.warn("[AuthProvider.useEffect()] Initial client session lookup threw", {
          message: error instanceof Error ? error.message : String(error),
        });
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      console.info("[AuthProvider.onAuthStateChange()] Auth event received", {
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id || null,
        role:
          session?.user?.user_metadata?.role ||
          session?.user?.app_metadata?.role ||
          null,
      });

      void applyAuthProviderEvent({
        event,
        session,
        refresh: () => router.refresh(),
        replace: (href) => router.replace(href),
        signOut: () => supabase.auth.signOut(),
        setLoading,
      });
    });

    return () => {
      isMounted = false;
      console.info("[AuthProvider.useEffect()] Unmounting auth provider");
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-lamaSky animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
