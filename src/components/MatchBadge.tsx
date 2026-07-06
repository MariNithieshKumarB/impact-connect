import { Sparkles } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { scoreColor } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";

export function MatchBadge({ match, compact }: { match: MatchResult; compact?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 ${compact ? "text-xs" : "text-sm"}`}>
      <Sparkles className={`h-3.5 w-3.5 ${scoreColor(match.score)}`} />
      <span className={`font-semibold ${scoreColor(match.score)}`}>{match.score}% match</span>
      {!compact && <span className="text-xs text-muted-foreground">· {match.confidence}% conf.</span>}
    </div>
  );
}

export function MatchDetails({ match }: { match: MatchResult }) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <MatchBadge match={match} />
        <span className="text-xs text-muted-foreground">Confidence {match.confidence}%</span>
      </div>
      <p className="text-xs font-medium text-foreground/90">{match.recommendation}</p>
      {match.reasons.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {match.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}
      {match.missingSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground">Missing skills:</span>
          {match.missingSkills.slice(0, 5).map((s) => (
            <Badge key={s} variant="outline" className="border-amber-400/40 text-amber-300">{s}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
