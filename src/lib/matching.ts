// Client-side AI-style match scoring for Impact Link.
// Deterministic, fast, and works entirely from data we already fetch.

export interface VolunteerLike {
  skills?: string[] | null;
  interests?: string[] | null;
  availability?: string | null;
  experience?: string | null;
  preferred_location?: string | null;
  location?: string | null;
}

export interface OpportunityLike {
  title?: string;
  description?: string;
  required_skills?: string[] | null;
  location?: string | null;
  focus_area?: string | null; // from joined ngo
  ngos?: { focus_area?: string | null } | null;
}

export interface MatchResult {
  score: number; // 0-100
  confidence: number; // 0-100
  missingSkills: string[];
  matchedSkills: string[];
  reasons: string[];
  recommendation: string;
}

const norm = (s: string) => s.trim().toLowerCase();
const toSet = (arr?: string[] | null) => new Set((arr ?? []).map(norm).filter(Boolean));

function locationMatch(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const A = norm(a);
  const B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.85;
  const partsA = A.split(/[,\s]+/).filter(Boolean);
  const partsB = B.split(/[,\s]+/).filter(Boolean);
  const overlap = partsA.filter((p) => partsB.includes(p)).length;
  if (!overlap) return 0;
  return Math.min(0.7, overlap / Math.max(partsA.length, partsB.length));
}

function availabilityScore(availability?: string | null): number {
  if (!availability) return 0;
  const t = availability.toLowerCase();
  let s = 0.5;
  if (/(weekend|weekday|evening|morning|full.?time|part.?time|flexible)/.test(t)) s += 0.3;
  if (/\d+\s*(hr|hour)/.test(t)) s += 0.2;
  return Math.min(1, s);
}

function experienceScore(exp?: string | null): number {
  if (!exp) return 0;
  const words = exp.trim().split(/\s+/).length;
  if (words < 5) return 0.25;
  if (words < 20) return 0.6;
  if (words < 60) return 0.85;
  return 1;
}

function interestMatch(v: VolunteerLike, o: OpportunityLike): number {
  const interests = toSet(v.interests);
  if (!interests.size) return 0;
  const focus = norm(o.ngos?.focus_area ?? o.focus_area ?? "");
  const blob = norm(`${o.title ?? ""} ${o.description ?? ""} ${focus}`);
  if (!blob) return 0;
  let hits = 0;
  interests.forEach((i) => { if (i && blob.includes(i)) hits++; });
  if (focus && interests.has(focus)) hits += 1;
  return Math.min(1, hits / Math.max(1, Math.min(interests.size, 4)));
}

export function computeMatch(v: VolunteerLike, o: OpportunityLike): MatchResult {
  const req = toSet(o.required_skills);
  const have = toSet(v.skills);
  const matchedSkills = [...req].filter((s) => have.has(s));
  const missingSkills = [...req].filter((s) => !have.has(s));
  const skillsScore = req.size === 0 ? 0.5 : matchedSkills.length / req.size;

  const interests = interestMatch(v, o);
  const avail = availabilityScore(v.availability);
  const exp = experienceScore(v.experience);
  const locRaw = Math.max(
    locationMatch(v.preferred_location, o.location),
    locationMatch(v.location, o.location) * 0.9,
  );

  // Weights: skills 45, location 20, interests 15, availability 10, experience 10
  const score01 =
    skillsScore * 0.45 +
    locRaw * 0.20 +
    interests * 0.15 +
    avail * 0.10 +
    exp * 0.10;
  const score = Math.round(score01 * 100);

  // Confidence: how much data we had to compute
  const signals = [
    have.size > 0,
    req.size > 0,
    !!v.availability,
    !!v.experience,
    !!(v.preferred_location || v.location),
    !!o.location,
    (v.interests?.length ?? 0) > 0,
  ];
  const confidence = Math.round((signals.filter(Boolean).length / signals.length) * 100);

  const reasons: string[] = [];
  if (matchedSkills.length) reasons.push(`Skill match: ${matchedSkills.slice(0, 4).join(", ")}`);
  if (missingSkills.length) reasons.push(`Missing: ${missingSkills.slice(0, 3).join(", ")}`);
  if (locRaw >= 0.85) reasons.push("Lives nearby");
  else if (locRaw > 0) reasons.push("Location partially aligns");
  if (interests > 0.5) reasons.push("Strong interest alignment");
  if (avail >= 0.8) reasons.push("Available on required days");
  if (exp >= 0.85) reasons.push("Solid prior experience");

  let recommendation = "Low fit — consider only if capacity allows.";
  if (score >= 85) recommendation = "Excellent match — prioritize this volunteer.";
  else if (score >= 70) recommendation = "Strong match — recommended to shortlist.";
  else if (score >= 50) recommendation = "Fair match — worth reviewing.";

  return { score, confidence, matchedSkills, missingSkills, reasons, recommendation };
}

export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-primary";
  if (score >= 50) return "text-amber-400";
  return "text-muted-foreground";
}
