"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }, [email, password, router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-xl font-bold text-white">PB</span>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Paris Bridals</CardTitle>
              <CardDescription className="text-slate-500 mt-1">Admin Dashboard</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="admin@parisbridals.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-white border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-400">
              <p>Authorized access only</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
