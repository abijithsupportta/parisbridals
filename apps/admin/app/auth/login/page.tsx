"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Use server API for auth — does signIn + staff lookup in one shot
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      const { access_token, refresh_token, ...userProfile } = result.data;

      // Set browser session with tokens (stores cookies locally)
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError("Session error. Please try again.");
        setIsLoading(false);
        return;
      }

      // Cache user profile so AuthProvider skips the /api/auth/me call
      sessionStorage.setItem('pb_auth_user', JSON.stringify(userProfile));

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }, [email, password, router, supabase]);

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      {/* Left side - Premium Dark Theme Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-950 overflow-hidden flex-col justify-between p-12">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black opacity-80" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.svg')] opacity-[0.03]" />
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/20 flex items-center justify-center">
             <img src="/logo.svg" alt="Paris Bridals Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest">
            Paris Bridals
          </span>
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span className="text-xs font-medium text-amber-100 uppercase tracking-wider">Premium Dashboard</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-white leading-tight tracking-tight mb-6">
            Manage your <span className="font-semibold text-amber-200">luxury rental</span> collection.
          </h1>
          <p className="text-slate-400 text-lg font-light leading-relaxed">
            The exclusive administration suite for Paris Bridals. Seamlessly control inventory, process orders, and curate the perfect experience for your clients.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <div className="w-full max-w-sm space-y-10">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden text-center space-y-4 mb-8">
             <div className="w-16 h-16 mx-auto bg-slate-950 rounded-2xl p-3 shadow-xl">
               <img src="/logo.svg" alt="Paris Bridals" className="w-full h-full brightness-0 invert" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Paris Bridals</h1>
               <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest">Admin Portal</p>
             </div>
          </div>

          {/* Form Header */}
          <div className="hidden lg:block space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500">Please enter your credentials to access the portal.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl text-base transition-all"
                  placeholder="admin@parisbridals.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl text-base transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-slate-950 hover:bg-slate-800 text-white text-base font-medium rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              Authorized Personnel Only
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
