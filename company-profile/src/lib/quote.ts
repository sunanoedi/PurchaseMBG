import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {emailBody,type Enquiry} from './quote-core';
export function redisUrl(value:string){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname.endsWith('.upstash.io')&&!u.username&&!u.password&&!u.search&&!u.hash&&(u.pathname==='/'||u.pathname==='')&&(!u.port||u.port==='443');}catch{return false;}}
export function quoteConfig(){
 const data={siteKey:process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,captcha:process.env.TURNSTILE_SECRET_KEY,resend:process.env.RESEND_API_KEY,from:process.env.RESEND_FROM_EMAIL,to:process.env.CONTACT_TO_EMAIL,redis:process.env.UPSTASH_REDIS_REST_URL,redisToken:process.env.UPSTASH_REDIS_REST_TOKEN,salt:process.env.RATE_LIMIT_SALT};
 const parsed=z.object({siteKey:z.string().min(1),captcha:z.string().min(1),resend:z.string().min(1),from:z.email(),to:z.email(),redis:z.string().refine(redisUrl),redisToken:z.string().min(1),salt:z.string().min(32)}).safeParse(data);return parsed.success?parsed.data:null;
}
export function trustedIp(request:Request){if(process.env.VERCEL==='1'){const ip=request.headers.get('x-real-ip');return ip&&isIP(ip)?ip:null;}return process.env.NODE_ENV==='development'?'127.0.0.1':null;}
export function redisKey(ip:string,salt:string,now=Date.now()){const window=Math.floor(now/900000);return 'quote:'+window+':'+createHmac('sha256',salt).update(`${window}:${ip}`).digest('hex');}
export async function rateLimit(config:NonNullable<ReturnType<typeof quoteConfig>>,ip:string){
 const response=await fetch(config.redis,{method:'POST',headers:{Authorization:`Bearer ${config.redisToken}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n",1,redisKey(ip,config.salt)]),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Rate service unavailable');const data=await response.json();if(!Number.isInteger(data.result)||data.result<1)throw new Error('Invalid rate response');return data.result<=5;
}
export async function verifyCaptcha(config:NonNullable<ReturnType<typeof quoteConfig>>,token:string){
 const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:config.captcha,response:token}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Captcha unavailable');const data=await response.json(),age=Date.now()-Date.parse(data.challenge_ts);return data.success===true&&['ubg.id','www.ubg.id'].includes(data.hostname)&&data.action==='quote'&&Number.isFinite(age)&&age>=-30000&&age<=300000;
}
export async function sendEnquiry(config:NonNullable<ReturnType<typeof quoteConfig>>,data:Enquiry){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.resend}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.from,to:[config.to],reply_to:data.email,subject:'UBG — quotation enquiry',text:emailBody(data)}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(7000)});if(!response.ok||typeof(await response.json()).id!=='string')throw new Error('Delivery unavailable');
}
