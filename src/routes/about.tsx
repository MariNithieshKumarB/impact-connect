import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Impact Link" },
      { name: "description", content: "Impact Link is on a mission to connect every willing heart with a cause that needs it." },
      { property: "og:title", content: "About — Impact Link" },
      { property: "og:description", content: "Impact Link connects volunteers with NGOs to create real social impact." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <h1 className="font-display text-5xl font-bold md:text-6xl">
          A platform for <span className="gradient-text">people who care</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Impact Link was born from a simple observation: the world doesn't lack goodwill — it lacks the right connections.
          Volunteers want to help but don't know where. NGOs need talent but don't know how to find it.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          We're building the intelligent layer between good intentions and real outcomes. Skill-based matching, transparent
          organizations, and a beautifully simple experience — that's what every social good deserves.
        </p>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { t: "Our Mission", d: "Match every willing heart with a cause that needs it." },
            { t: "Our Vision", d: "A world where doing good is frictionless." },
            { t: "Our Values", d: "Transparency, empathy, measurable impact." },
          ].map((b) => (
            <div key={b.t} className="glass rounded-2xl p-6">
              <div className="font-display text-lg font-semibold">{b.t}</div>
              <div className="mt-2 text-sm text-muted-foreground">{b.d}</div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
