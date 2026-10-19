import "server-only";
import { headers } from "next/headers";
import { createRemoteJWKSet } from "jose";
import { verifyEditorToken } from "./access-core";
import { securityLog } from "./security";
const sets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function editorAllowed(assertion?: string | null) {
  const team = process.env.CF_ACCESS_TEAM_DOMAIN,
    aud = process.env.CF_ACCESS_AUD;
  const allowed = (process.env.CF_ACCESS_EDITOR_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (
    !team ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) ||
    !aud ||
    !allowed.length
  )
    return false;
  const token = assertion ?? (await headers()).get("cf-access-jwt-assertion");
  if (!token || token.length > 16000) return false;
  try {
    const issuer = `https://${team}`;
    if (!sets.has(team))
      sets.set(
        team,
        createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
          timeoutDuration: 5000,
        }),
      );
    const allowedEditor = await verifyEditorToken(token, sets.get(team)!, {
      issuer,
      audience: aud,
      emails: allowed,
    });
    if (!allowedEditor) securityLog("preview.denied");
    return allowedEditor;
  } catch {
    securityLog("preview.denied");
    return false;
  }
}
