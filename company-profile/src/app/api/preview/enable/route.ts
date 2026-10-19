import {NextRequest,NextResponse} from 'next/server';
import {draftMode} from 'next/headers';
import {editorAllowed} from '@/lib/access';
import {apiJson} from '@/lib/quote-core';
export async function GET(request:NextRequest){if(!await editorAllowed())return apiJson({ok:false},403);const locale=request.nextUrl.searchParams.get('locale'),slug=request.nextUrl.searchParams.get('slug');if(!['id','en'].includes(locale??'')||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>160)return apiJson({ok:false},400);(await draftMode()).enable();const response=NextResponse.redirect(new URL(`/${locale}/preview/articles/${slug}`,request.url));response.headers.set('Cache-Control','private, no-store');return response;}
