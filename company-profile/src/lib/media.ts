import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export function mediaUrl(asset: string, preview = false) {
  const secret = process.env.SANITY_ASSET_SIGNING_SECRET;
  if (!secret || secret.length < 32) return null;
  const expiry = Math.floor(Date.now() / 300000) * 300 + 3600;
  const signature = createHmac("sha256", secret)
    .update(`${asset}:${expiry}:${preview ? "draft" : "public"}`)
    .digest("hex");
  return `/media/${asset}?expires=${expiry}&mode=${preview ? "draft" : "public"}&signature=${signature}`;
}
export function validMedia(
  asset: string,
  expires: string,
  mode: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (
    !/^image-[a-f0-9]+-\d+x\d+-(jpg|png|webp)$/.test(asset) ||
    !/^\d{10}$/.test(expires) ||
    !["draft", "public"].includes(mode) ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    secret.length < 32
  )
    return false;
  const remaining = Number(expires) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > 3600) return false;
  const expected = createHmac("sha256", secret)
    .update(`${asset}:${expires}:${mode}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function imageMagic(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  return (
    type === "image/webp" &&
    Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP"
  );
}
