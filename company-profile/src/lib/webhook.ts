import {timingSafeEqual} from 'node:crypto';
import {decodeSignatureHeader,encodeSignatureHeader} from '@sanity/webhook';
import {z} from 'zod';
export async function verifyWebhook(body:string,signature:string,secret:string,now=Date.now()){
 if(secret.length<32||signature.length>1000)return false;
 try{const {timestamp}=decodeSignatureHeader(signature);if(!Number.isFinite(timestamp)||now-timestamp>300000||timestamp-now>60000)return false;const expected=await encodeSignatureHeader(body,timestamp,secret);return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}catch{return false;}
}
export const webhookSchema=z.object({projectId:z.string(),dataset:z.string(),_type:z.enum(['menuPackage','galleryItem','article','client','certificate','siteSettings']),_id:z.string().min(1).max(200)}).strict();
