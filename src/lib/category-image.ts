// Maps opportunity cause/title keywords to a relevant Unsplash cover image.
// Uses Unsplash's featured photo endpoint for deterministic, high-quality results.

const MAP: Array<{ match: RegExp; url: string; label: string }> = [
  { match: /(read|educat|teach|school|literacy|mentor|tutor|children|child)/i,
    url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop",
    label: "Education" },
  { match: /(tree|plant|environment|climate|nature|forest|green|clean)/i,
    url: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80&auto=format&fit=crop",
    label: "Environment" },
  { match: /(health|medic|first ?aid|clinic|hospital|blood|nurs)/i,
    url: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&q=80&auto=format&fit=crop",
    label: "Healthcare" },
  { match: /(elder|senior|old ?age)/i,
    url: "https://images.unsplash.com/photo-1516307365426-bea591f05011?w=1200&q=80&auto=format&fit=crop",
    label: "Elderly Support" },
  { match: /(food|meal|hunger|kitchen|distribut)/i,
    url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80&auto=format&fit=crop",
    label: "Hunger Relief" },
  { match: /(animal|pet|dog|cat|wildlife|rescue)/i,
    url: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80&auto=format&fit=crop",
    label: "Animal Welfare" },
  { match: /(disaster|relief|flood|earthquake|emergenc)/i,
    url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&q=80&auto=format&fit=crop",
    label: "Disaster Relief" },
  { match: /(women|girl|empower|gender)/i,
    url: "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=1200&q=80&auto=format&fit=crop",
    label: "Women Empowerment" },
  { match: /(tech|code|digital|comput|software)/i,
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80&auto=format&fit=crop",
    label: "Technology" },
  { match: /(livelihood|skill|craft|farm|artisan)/i,
    url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1200&q=80&auto=format&fit=crop",
    label: "Livelihoods" },
];

const FALLBACK = "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=1200&q=80&auto=format&fit=crop";

export function categoryImage(...hints: Array<string | null | undefined>): string {
  const blob = hints.filter(Boolean).join(" ");
  for (const m of MAP) if (m.match.test(blob)) return m.url;
  return FALLBACK;
}
