import { jwtVerify, type JWTVerifyGetKey } from "jose";
export async function verifyEditorToken(
  token: string,
  key: JWTVerifyGetKey,
  config: { issuer: string; audience: string; emails: string[] },
) {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "email"],
      maxTokenAge: "8h",
    });
    return (
      typeof payload.email === "string" &&
      config.emails.includes(payload.email.toLowerCase())
    );
  } catch {
    return false;
  }
}
