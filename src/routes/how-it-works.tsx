import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Impact Link" },
      { name: "description", content: "Discover how Impact Link matches volunteers with NGOs to create meaningful change." },
      { property: "og:title", content: "How It Works — Impact Link" },
      { property: "og:description", content: "Discover how Impact Link matches volunteers with NGOs to create meaningful change." },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  { role: "For Volunteers", items: [
    { t: "Sign up in 30 seconds", d: "Tell us your skills, interests, and availability." },
    { t: "Get personalized matches", d: "We surface NGOs and opportunities that fit your profile." },
    { t: "Apply & make impact", d: "Send applications, get accepted, and track your contribution." },
  ]},
  { role: "For NGOs", items: [
    { t: "Register your organization", d: "Share your mission, focus area, and location." },
    { t: "Post opportunities", d: "Describe the roles you need and the skills required." },
    { t: "Review applicants", d: "See qualified volunteers ranked by fit and manage applications." },
  ]},
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <h1 className="font-display text-5xl font-bold md:text-6xl">How <span className="gradient-text">Impact Link</span> Works</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          A simple, elegant flow designed for both sides of the impact equation.
        </p>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          {STEPS.map((group) => (
            <div key={group.role} className="glass rounded-3xl p-8">
              <h2 className="font-display text-2xl font-semibold">{group.role}</h2>
              <ol className="mt-6 space-y-6">
                {group.items.map((s, i) => (
                  <li key={s.t} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary font-bold text-white">{i + 1}</div>
                    <div>
                      <div className="font-semibold">{s.t}</div>
                      <div className="text-sm text-muted-foreground">{s.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
