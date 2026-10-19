import { handleQuote } from "@/lib/quote-core";
import {
  quoteConfig,
  trustedIp,
  rateLimit,
  verifyCaptcha,
  sendEnquiry,
} from "@/lib/quote";
import { securityLog } from "@/lib/security";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const config = quoteConfig(),
    ip = trustedIp(request);
  return handleQuote(request, {
    configured: Boolean(config),
    ip,
    origins: [
      "https://ubg.id",
      "https://www.ubg.id",
      ...(process.env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ],
    limit: () => rateLimit(config!, ip!),
    captcha: (token) => verifyCaptcha(config!, token),
    deliver: (data) => sendEnquiry(config!, data),
    log: securityLog,
  });
}
