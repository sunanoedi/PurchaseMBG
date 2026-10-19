import {NextRequest} from 'next/server';
import {validMedia,imageMagic} from '@/lib/media';
import {cmsConfig} from '@/lib/cms';
import {editorAllowed} from '@/lib/access';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{asset:string}>}){
  const {asset}=await params,q=request.nextUrl.searchParams,mode=q.get('mode')??'',exp=q.get('expires')??'';
  const reject=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'private, no-store'}});
  if(!validMedia(asset,exp,mode,q.get('signature')??'',process.env.SANITY_ASSET_SIGNING_SECRET??''))return reject(403);
  if(mode==='draft'&&!(await editorAllowed()))return reject(403);
  const config=cmsConfig(mode==='draft');if(!config)return reject(503);
  const match=asset.match(/^image-([a-f0-9]+)-(\d+x\d+)-(jpg|png|webp)$/)!;
  const [width,height]=match[2].split('x').map(Number);if(width>8192||height>8192||width*height>25_000_000)return reject(404);
  try{
    const signal=AbortSignal.timeout(7000);
    const upstream=await fetch(`https://cdn.sanity.io/images/${config.projectId}/${config.dataset}/${match[1]}-${match[2]}.${match[3]}`,{redirect:'error',cache:'no-store',signal});
    const type=upstream.headers.get('content-type')?.split(';')[0]??'';
    if(!upstream.ok||!['image/jpeg','image/png','image/webp'].includes(type)||Number(upstream.headers.get('content-length'))>5*1024*1024)return reject(404);
    const reader=upstream.body?.getReader();if(!reader)return reject(502);let size=0;const chunks:Uint8Array[]=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024)return reject(413);chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    const data=Buffer.concat(chunks);if(!imageMagic(data,type))return reject(415);
    const ttl=Math.max(0,Math.min(300,Number(exp)-Math.floor(Date.now()/1000)));
    return new Response(data,{headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Cache-Control':mode==='draft'?'private, no-store':`public, max-age=${Math.min(60,ttl)}, s-maxage=${ttl}, must-revalidate`}});
  }catch{return reject(502);}
}
