import 'server-only';
import {createClient,defineQuery} from 'next-sanity';
import {unstable_cache} from 'next/cache';
import {approvedRecords} from '../../content/records';
import {visibleRecords} from './cms-model';
import {editorAllowed} from './access';
import {securityLog} from './security';
const types=['menuPackage','galleryItem','article','client','certificate','siteSettings'];
const query=defineQuery(`*[_type in $types] | order(order asc){...,"photo":coalesce(photo,logo){...,asset->{_id,mimeType,size,metadata{dimensions}}}}`);
export function cmsConfig(preview=false) {
  const projectId=process.env.SANITY_PROJECT_ID,dataset=process.env.SANITY_DATASET,token=preview?process.env.SANITY_PREVIEW_READ_TOKEN:process.env.SANITY_READ_TOKEN;
  return projectId&&/^[a-z0-9]{8}$/.test(projectId)&&dataset&&/^[a-z0-9_-]{1,64}$/.test(dataset)&&token?{projectId,dataset,token}:null;
}
async function fetchRecords(preview=false):Promise<unknown[]|null>{
  const config=cmsConfig(preview);if(!config)return null;
  try {const client=createClient({...config,apiVersion:'2026-01-01',useCdn:false,stega:false,timeout:5000,maxRetries:0});const data=await client.fetch(query,{types},{perspective:preview?'drafts':'published',cache:'no-store'});if(!Array.isArray(data))throw new Error('Invalid CMS response');return data;}catch{securityLog('cms.unavailable');return null;}
}
const published=unstable_cache(()=>fetchRecords(false),['ubg-cms-v1'],{revalidate:60,tags:['cms']});
export async function getCmsData(preview=false){
  if(preview&&!(await editorAllowed()))return {records:[],fallback:false};
  const raw=preview?await fetchRecords(true):await published();
  return {records:visibleRecords(raw??approvedRecords,new Date(),preview),fallback:raw===null};
}
export async function getRecords(preview=false){return (await getCmsData(preview)).records;}
