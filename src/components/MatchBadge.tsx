import { Sparkles, CheckCircle2, MapPin, CalendarClock, Heart, Wrench } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { scoreColor } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";

type Tier = { label: string; emoji: string; classes: string };

function tier(score: number): Tier {
  if (score >= 95) return { label: "Highly Recommended", emoji: "🟢", classes: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" };
  if (score >= 85) return { label: "Recommended", emoji: "🟡", classes: "border-amber-400/40 bg-amber-400/10 text-amber-300" };
  if (score >= 70) return { label: "Good Match", emoji: "🔵", classes: "border-sky-400/40 bg-sky-400/10 text-sky-300" };
  return { label: "Fair Match", emoji: "⚪", classes: "border-border/60 bg-muted/40 text-muted-foreground" };
}

/** Circular progress ring around the score */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  const color = score >= 95 ? "oklch(0.72 0.17 165)" : score >= 85 ? "oklch(0.78 0.14 80)" : score >= 70 ? "oklch(0.7 0.15 240)" : "oklch(0.6 0.02 275)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 10%)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`text-xs font-bold ${scoreColor(score)}`}>{score}%</span>
      </div>
    </div>
  );
}

export function MatchBadge({ match, compact }: { match: MatchResult; compact?: boolean }) {
  const t = tier(match.score);
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${t.classes} px-2.5 py-1 ${compact ? "text-xs" : "text-sm"}`}>
      <Sparkles className="h-3.5 w-3.5" />
      <span className="font-semibold">{match.score}% match</span>
      {!compact && <span className="text-[10px] opacity-80">· {t.emoji} {t.label}</span>}
    </div>
  );
}

/** Rich AI recommendation card — the “why this match?” panel */
export function MatchDetails({ match }: { match: MatchResult }) {
  const t = tier(match.score);
  const bullets: Array<{ icon: any; text: string }> = [];
  if (match.matchedSkills.length) bullets.push({ icon: Wrench, text: `Skills match: ${match.matchedSkills.slice(0, 5).join(", ")}` });
  match.reasons.forEach((r) => {
    if (r.startsWith("Skill") || r.startsWith("Missing")) return; // dedupe with above
    const icon = /nearby|location/i.test(r) ? MapPin : /available/i.test(r) ? CalendarClock : /interest/i.test(r) ? Heart : CheckCircle2;
    bullets.push({ icon, text: r });
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background/40 to-secondary/10 p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <ScoreRing score={match.score} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${t.classes}`}>
              {t.emoji} {t.label}
            </span>
            <span className="text-[11px] text-muted-foreground">Confidence {match.confidence}%</span>
          </div>
          <p className="text-xs font-medium text-foreground/90">{match.recommendation}</p>
          {bullets.length > 0 && (
            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {bullets.slice(0, 6).map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <b.icon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          )}
          {match.missingSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground">To improve match:</span>
              {match.missingSkills.slice(0, 5).map((s) => (
                <Badge key={s} variant="outline" className="border-amber-400/40 text-[10px] text-amber-300">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
