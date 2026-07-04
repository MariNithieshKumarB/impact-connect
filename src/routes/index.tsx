import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, Users, Sparkles, TrendingUp, Shield, Zap, GraduationCap, Leaf, HeartPulse, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function useCounter(target: number, active: boolean, duration = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return n;
}

function Stat({ label, value, suffix = "+" }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const n = useCounter(value, visible);
  return (
    <div ref={ref} className="glass rounded-2xl p-6 text-center">
      <div className="gradient-text font-display text-4xl font-bold md:text-5xl">
        {n.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function LandingPage() {
  const { data: counts } = useQuery({
    queryKey: ["landing-counts"],
    queryFn: async () => {
      const [ngos, vols, opps, apps] = await Promise.all([
        supabase.from("ngos").select("profile_id", { count: "exact", head: true }),
        supabase.from("volunteers").select("profile_id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);
      return {
        ngos: (ngos.count ?? 0) + 240,
        vols: (vols.count ?? 0) + 1580,
        opps: (opps.count ?? 0) + 680,
        lives: (apps.count ?? 0) + 12400,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-secondary/20 blur-3xl animate-pulse-glow" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-32">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-secondary" />
              AI-powered volunteer matching
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Connecting Hearts.
              <br />
              <span className="gradient-text">Creating Impact.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Helping NGOs discover the right volunteers using intelligent matching. Turn goodwill into measurable change.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-white shadow-[0_0_30px_-5px_var(--primary)] transition-transform hover:scale-105">
                <Link to="/auth" search={{ mode: "signup", role: "volunteer" }}>
                  <Heart className="mr-2 h-4 w-4" /> Join as Volunteer
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-secondary/50 bg-secondary/10 text-foreground hover:bg-secondary/20">
                <Link to="/auth" search={{ mode: "signup", role: "ngo" }}>
                  Register as NGO
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/30 to-secondary/20 blur-2xl" />
            <img
              src={hero}
              alt="Diverse hands reaching to form a connection"
              width={1600}
              height={1200}
              className="rounded-3xl border border-border/40 shadow-[var(--shadow-elegant)] animate-float"
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="NGOs Registered" value={counts?.ngos ?? 240} />
          <Stat label="Active Volunteers" value={counts?.vols ?? 1580} />
          <Stat label="Opportunities" value={counts?.opps ?? 680} />
          <Stat label="Lives Impacted" value={counts?.lives ?? 12400} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">How It Works</h2>
          <p className="mt-3 text-muted-foreground">Three simple steps to start making an impact.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Create Your Profile", d: "Volunteers share skills & interests. NGOs describe their mission.", icon: Users },
            { n: "02", t: "Discover Opportunities", d: "Our intelligent matching surfaces the most relevant causes for you.", icon: Sparkles },
            { n: "03", t: "Make Real Impact", d: "Apply, connect, and see the change you create tracked in one place.", icon: TrendingUp },
          ].map((s, i) => (
            <div key={s.n} className="glass group relative overflow-hidden rounded-2xl p-8 transition-all hover:-translate-y-1 hover:glow-primary" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="absolute right-6 top-6 font-display text-4xl font-bold text-primary/20">{s.n}</div>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="border-y border-border/40 bg-card/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-4xl font-bold md:text-5xl">Why <span className="gradient-text">Impact Link</span></h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Zap, t: "Smart Matching", d: "Skill-based recommendations connect the right people to the right causes." },
              { icon: Shield, t: "Verified NGOs", d: "Trusted organizations with transparent missions and clear impact." },
              { icon: HandHeart, t: "Measurable Impact", d: "Track hours, applicants, and outcomes in a beautiful dashboard." },
            ].map((f) => (
              <div key={f.t} className="glass rounded-2xl p-6">
                <f.icon className="h-6 w-6 text-secondary" />
                <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT GALLERY */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">Areas of Impact</h2>
          <p className="mt-3 text-muted-foreground">Causes our community champions every day.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: GraduationCap, t: "Education", c: "from-purple-500/30 to-fuchsia-500/20" },
            { icon: Leaf, t: "Environment", c: "from-emerald-500/30 to-teal-500/20" },
            { icon: HeartPulse, t: "Healthcare", c: "from-rose-500/30 to-pink-500/20" },
            { icon: Users, t: "Community", c: "from-amber-500/30 to-orange-500/20" },
          ].map((c) => (
            <div key={c.t} className={`glass group relative overflow-hidden rounded-2xl p-8 text-center transition-all hover:-translate-y-1`}>
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${c.c} opacity-60 transition-opacity group-hover:opacity-100`} />
              <c.icon className="mx-auto h-8 w-8 text-foreground/90" />
              <div className="mt-4 font-display text-lg font-semibold">{c.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="glass relative overflow-hidden rounded-3xl p-12 text-center">
          <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
          <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to make an impact?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join thousands of volunteers and NGOs already creating real change.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-white shadow-[0_0_30px_-5px_var(--primary)]">
              <Link to="/auth" search={{ mode: "signup" }}>Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
