import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {schemaTypes} from './schemaTypes';
import id from '../company-profile/content/id.json';
const projectId=process.env.SANITY_STUDIO_PROJECT_ID,dataset=process.env.SANITY_STUDIO_DATASET,provider=process.env.SANITY_STUDIO_SSO_PROVIDER,preview=process.env.SANITY_STUDIO_PREVIEW_ORIGIN;
if(!projectId||!/^[a-z0-9]{8}$/.test(projectId)||!dataset||!/^[a-z0-9_-]{1,64}$/.test(dataset)||!provider||preview!=='https://preview.ubg.id')throw new Error('Configure all non-secret SANITY_STUDIO_* identifiers and the real SSO provider.');
export default defineConfig({
 name:'ubg',title:id.brand.name,projectId,dataset,
 // Native Sanity login. Real organization/IdP enforcement is configured outside this repository.
 auth:{providers:previous=>previous.filter(p=>p.name===provider),redirectOnSingle:true},
 plugins:[structureTool({structure:S=>S.list().title(id.studio.siteSettings).items([S.listItem().title(id.studio.siteSettings).id('siteSettings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),...S.documentTypeListItems().filter(item=>item.getId()!=='siteSettings')])})],
 schema:{types:schemaTypes,templates:templates=>templates.filter(t=>t.schemaType!=='siteSettings')},
 document:{
  actions:(actions,context)=>context.schemaType==='siteSettings'?actions.filter(a=>!['delete','duplicate','unpublish'].includes(a.action??'')):actions,
  productionUrl:async(previous,context)=>{if(context.document._type!=='article')return previous;const slug=(context.document.slug as {id?:{current?:string}})?.id?.current;return slug?`${preview}/api/preview/enable?locale=id&slug=${encodeURIComponent(slug)}`:previous;},
 },
});
