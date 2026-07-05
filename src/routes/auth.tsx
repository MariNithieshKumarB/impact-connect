import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Heart, Building2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  role: z.enum(["volunteer", "ngo"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In — Impact Link" },
      { name: "description", content: "Sign in or create your Impact Link account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup" | "quick">(search.mode === "signup" ? "signup" : "quick");
  const [role, setRole] = useState<"volunteer" | "ngo">(search.role ?? "volunteer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    navigate({ to: "/dashboard" });
  };

  const handleQuickStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error("Please enter your name");
    setLoading(true);
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "guest";
    const rand = Math.random().toString(36).slice(2, 10);
    const quickEmail = `${slug}-${rand}@quick.impactlink.app`;
    const quickPassword = `IL-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await supabase.auth.signUp({
      email: quickEmail,
      password: quickPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), role },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Ensure session in case email confirmation isn't auto (fallback sign-in)
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      await supabase.auth.signInWithPassword({ email: quickEmail, password: quickPassword });
    }
    setLoading(false);
    toast.success(`Welcome, ${fullName.trim()}!`);
    navigate({ to: "/dashboard" });

  const handleGoogle = async () => {
    setLoading(true);
    // Persist chosen role so the trigger can pick it up on first sign-in
    if (typeof window !== "undefined") {
      window.localStorage.setItem("impactlink:pending-role", role);
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none absolute -left-32 top-16 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl animate-pulse-glow" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8"><Logo /></Link>

        <div className="glass w-full rounded-3xl p-8 shadow-[var(--shadow-elegant)]">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup" | "quick")}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="quick">Quick Start</TabsTrigger>
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="mt-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold">Jump right in</h3>
                <p className="text-xs text-muted-foreground">
                  Just enter your name and pick your role — we'll create a free account instantly. No email or password needed.
                </p>
              </div>
              <form onSubmit={handleQuickStart} className="space-y-4">
                <div>
                  <Label htmlFor="q-name">Your name {role === "ngo" ? "(organization)" : ""}</Label>
                  <Input
                    id="q-name"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === "ngo" ? "Green Earth Foundation" : "Alex Rivera"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    onClick={() => setRole("volunteer")}
                    className={`h-auto flex-col gap-1 py-3 ${role === "volunteer" ? "bg-gradient-to-r from-primary to-primary-glow text-white" : "bg-muted text-foreground hover:bg-muted/70"}`}
                  >
                    <Heart className="h-5 w-5" />
                    <span className="text-sm font-medium">Enter as Volunteer</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    onClick={() => setRole("ngo")}
                    className={`h-auto flex-col gap-1 py-3 ${role === "ngo" ? "bg-gradient-to-r from-secondary to-secondary/70 text-white" : "bg-muted text-foreground hover:bg-muted/70"}`}
                  >
                    <Building2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Enter as NGO</span>
                  </Button>
                </div>
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Setting up your account…
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="login" className="mt-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="li-pw">Password</Label>
                  <Input id="li-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-white">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
                </Button>
              </form>

              <div className="relative my-2 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                NEW HERE? CREATE A FREE ACCOUNT
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRole("volunteer"); setTab("signup"); }}
                  className="border-primary/40 hover:bg-primary/10"
                >
                  <Heart className="mr-2 h-4 w-4 text-primary" /> As Volunteer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRole("ngo"); setTab("signup"); }}
                  className="border-secondary/40 hover:bg-secondary/10"
                >
                  <Building2 className="mr-2 h-4 w-4 text-secondary" /> As NGO
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label>I am a…</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as "volunteer" | "ngo")} className="mt-2 grid grid-cols-2 gap-2">
                    <label htmlFor="r-vol" className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all ${role === "volunteer" ? "border-primary bg-primary/10" : "border-border"}`}>
                      <RadioGroupItem id="r-vol" value="volunteer" className="sr-only" />
                      <Heart className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Volunteer</span>
                    </label>
                    <label htmlFor="r-ngo" className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all ${role === "ngo" ? "border-secondary bg-secondary/10" : "border-border"}`}>
                      <RadioGroupItem id="r-ngo" value="ngo" className="sr-only" />
                      <Building2 className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium">NGO</span>
                    </label>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="su-name">{role === "ngo" ? "Organization name" : "Full name"}</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-white">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            OR
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to Impact Link's Terms & Privacy.
        </p>
      </div>
    </div>
  );
}
