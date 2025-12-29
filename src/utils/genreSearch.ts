export const toGenreSearchKey = (s: string): string => {
  let t = (s || "").toLowerCase().trim();
  if (!t) return "";

  // Normalize common separators/aliases
  t = t
    .replace(/&/g, " and ")
    .replace(/\+/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip non-alphanumerics/spaces for robust matching
  t = t.replace(/[^a-z0-9]/g, "");

  // Collapse common genre aliases
  // r&b / r and b / randb -> rnb
  t = t.replace(/randb/g, "rnb");

  return t;
};

export const isSpamGenreLabel = (label: string): boolean => {
  const t = (label || "").trim().toLowerCase();
  if (!t) return true;

  // Discard number-ish "genres" like: "100", "-100", "3s", "3-5"
  if (/^-?\d+$/.test(t)) return true;
  if (/^-?\d+s$/.test(t)) return true;
  if (/^\d+\s*-\s*\d+$/.test(t)) return true;
  if (/^-?\d+(?:-\d+)+$/.test(t)) return true;

  return false;
};

export const parseGenreQueryTerms = (input: string): string[] => {
  const raw = (input || "")
    .split(/[,\|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // Dedupe normalized terms while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of raw) {
    const key = toGenreSearchKey(term);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
};

export const filterGenreLabels = (labels: string[]): string[] =>
  labels.filter((l) => !isSpamGenreLabel(l));

export const parseGenreQuery = (
  input: string
): { include: string[]; exclude: string[] } => {
  const raw = (input || "")
    .split(/[,\|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const includeSeen = new Set<string>();
  const excludeSeen = new Set<string>();
  const include: string[] = [];
  const exclude: string[] = [];

  for (const term of raw) {
    const isExclude = term.startsWith("-") || term.startsWith("!");
    const cleaned = isExclude ? term.slice(1).trim() : term;
    const key = toGenreSearchKey(cleaned);
    if (!key) continue;

    if (isExclude) {
      if (!excludeSeen.has(key)) {
        excludeSeen.add(key);
        exclude.push(key);
      }
    } else {
      if (!includeSeen.has(key)) {
        includeSeen.add(key);
        include.push(key);
      }
    }
  }

  return { include, exclude };
};


