export function csp(nonce:string,development=false) {
  return `default-src 'none'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}; style-src 'self' ${development?"'unsafe-inline'":`'nonce-${nonce}'`}; style-src-attr ${development?"'unsafe-inline'":"'none'"}; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com${development?' ws:':''}; frame-src https://challenges.cloudflare.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
}
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
export function safeLink(value:unknown):value is string {
  if(typeof value!=='string'||value.length>2000)return false;
  try {const u=new URL(value);return ['https:','http:','mailto:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}
}
export function mapLink(value:string) {
  try {const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.google.com'&&u.pathname==='/maps'&&u.searchParams.get('output')==='embed'&&!u.username&&!u.password;}catch{return false;}
}
export type SecurityEvent = 'quote.config'|'quote.rate'|'quote.captcha'|'quote.delivery'|'cms.unavailable'|'cms.invalid'|'webhook.rejected'|'webhook.accepted'|'preview.denied';
export function securityLog(event:SecurityEvent) {
  try {console.info(JSON.stringify({kind:'security',event,requestId:crypto.randomUUID(),at:new Date().toISOString()}));}catch{/* Logging cannot change security decisions. */}
}
