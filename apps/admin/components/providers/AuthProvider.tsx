"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthenticated, setLoading } = useAppStore();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function initAuth() {
      try {
        setLoading(true);
        
        // 1. Check current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setAuthenticated(false);
          setUser(null);
          // Only redirect to login if not already on an auth page
          if (!pathname.startsWith('/auth')) {
            router.push('/auth/login');
          }
          return;
        }

        // 2. Fetch full user profile from our API (which includes store_id)
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const { user } = await response.json();
          setUser(user);
          setAuthenticated(true);
        } else {
          // If profile fetch fails, user might not be in staff table
          // but we still have an auth session.
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: (session.user.user_metadata?.role as any) || 'admin',
            store_id: session.user.user_metadata?.store_id || null,
            branch_id: null,
            staff_id: null,
          });
          setAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthenticated(false);
        router.push('/auth/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) initAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setAuthenticated, setLoading, router, pathname, supabase]);

  return (
    <>
      {!initialized && !pathname.startsWith('/auth') && (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 fixed inset-0 z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">Initializing session...</p>
          </div>
        </div>
      )}
      <div style={{ display: (!initialized && !pathname.startsWith('/auth')) ? 'none' : 'contents' }}>
        {children}
      </div>
    </>
  );
}
