import {revalidateTag,revalidatePath} from 'next/cache';
import {readBody,BodyError} from '@/lib/body';
import {verifyWebhook,webhookSchema} from '@/lib/webhook';
import {apiJson} from '@/lib/quote-core';
import {securityLog} from '@/lib/security';
export const runtime='nodejs';
export const maxDuration=20;
export async function POST(request:Request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return apiJson({ok:false},415);
 let body:string;try{body=await readBody(request,32768);}catch(error){return apiJson({ok:false},error instanceof BodyError?error.status:400);}
 const secret=process.env.SANITY_WEBHOOK_SECRET??'';
 if(!await verifyWebhook(body,request.headers.get('sanity-webhook-signature')??'',secret)){securityLog('webhook.rejected');return apiJson({ok:false},401);}
 let parsed;try{parsed=webhookSchema.safeParse(JSON.parse(body));}catch{return apiJson({ok:false},400);}
 if(!parsed.success||parsed.data.projectId!==process.env.SANITY_PROJECT_ID||parsed.data.dataset!==process.env.SANITY_DATASET||parsed.data._id.startsWith('drafts.'))return apiJson({ok:false},400);
 revalidateTag('cms',{expire:0});revalidatePath('/','layout');revalidatePath('/sitemap.xml');securityLog('webhook.accepted');return apiJson({ok:true});
}
