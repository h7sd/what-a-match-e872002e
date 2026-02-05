// Google Fonts loader (restricted)

const GOOGLE_FONTS_CSS2_ORIGIN = "https://fonts.googleapis.com";

function sanitizeFamily(family: string): string {
  return family
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9 \-]/g, "");
}

export function buildGoogleFontsCss2Url(families: string[]): string {
  const cleanFamilies = families
    .map(sanitizeFamily)
    .filter(Boolean);

  const url = new URL("/css2", GOOGLE_FONTS_CSS2_ORIGIN);

  // Use a sensible default weights set; Google ignores unknown weights.
  for (const fam of cleanFamilies) {
    // Encode spaces as + per Google Fonts convention
    const familyParam = fam.replace(/ /g, "+");
    url.searchParams.append("family", `${familyParam}:wght@200;300;400;500;600;700;800`);
  }

  url.searchParams.set("display", "swap");
  return url.toString();
}

export function ensureGoogleFontsLoaded(families: string[]): void {
  const cleanFamilies = families
    .map(sanitizeFamily)
    .filter(Boolean);

  if (cleanFamilies.length === 0) return;

  const href = buildGoogleFontsCss2Url(cleanFamilies);
  const id = `uv-google-fonts-${cleanFamilies.join("_").toLowerCase().replace(/[^a-z0-9_\-]/g, "_")}`;

  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;

  document.head.appendChild(link);
}

export function normalizeGoogleFontFamily(input: string): string {
  return sanitizeFamily(input);
}
