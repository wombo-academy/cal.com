export const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`;
/** @deprecated use `WEBAPP_URL` */
export const BASE_URL = WEBAPP_URL;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://cal.com";
export const CONSOLE_URL = WEBAPP_URL.startsWith("http://localhost")
  ? "http://localhost:3004"
  : `https://console.cal.${process.env.VERCEL_ENV === "production" ? "com" : "dev"}`;
export const EMBED_LIB_URL = process.env.NEXT_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const TRIAL_LIMIT_DAYS = 14;
export const HOSTED_CAL_FEATURES = process.env.HOSTED_CAL_FEATURES || BASE_URL === "https://app.cal.com";
/** @deprecated use `WEBAPP_URL` */
export const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`;
export const STRIPE_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "";
export const STRIPE_PRIVATE_KEY: string = process.env.STRIPE_PRIVATE_KEY || "";
export const STRIPE_WEBHOOK_SECRET: string = process.env.STRIPE_WEBHOOK_SECRET || "";
