import type {MetadataRoute} from 'next';
import {locales,href,dictionary,type PageKey} from '@/lib/content';
import {getRecords} from '@/lib/cms';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const records=await getRecords(),pages=Object.keys(dictionary('id').paths) as PageKey[];
 const base=locales.flatMap(locale=>pages.map(key=>({
  url:`https://ubg.id${href(locale,key)}`,
  alternates:{languages:{id:`https://ubg.id${href('id',key)}`,en:`https://ubg.id${href('en',key)}`}},
 })));
 const articles=records.filter(r=>r._type==='article').flatMap(a=>locales.map(locale=>({
  url:`https://ubg.id${href(locale,'articles',a.slug[locale].current)}`,
  alternates:{languages:{id:`https://ubg.id${href('id','articles',a.slug.id.current)}`,en:`https://ubg.id${href('en','articles',a.slug.en.current)}`}},
 })));
 return [...base,...articles];
}
