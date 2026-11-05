// The site's public origin, in one place. Set NEXT_PUBLIC_SITE_URL once a custom domain is attached;
// until then Vercel's production domain is used, so canonical URLs, the sitemap and OpenGraph images
// always point somewhere that resolves.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
