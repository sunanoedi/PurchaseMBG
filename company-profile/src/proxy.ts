import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
import {csp} from './lib/security';
const internationalize=createMiddleware({locales:['id','en'],defaultLocale:'id',localePrefix:'always',localeDetection:false,alternateLinks:false});
export default function proxy(request:NextRequest) {
  const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
  const policy=csp(nonce,process.env.NODE_ENV==='development');
  request.headers.set('x-nonce',nonce);
  request.headers.set('x-request-path',request.nextUrl.pathname);
  request.headers.set('x-locale',request.nextUrl.pathname.split('/')[1]==='en'?'en':'id');
  request.headers.set('Content-Security-Policy',policy);
  const response=internationalize(request);
  response.headers.set('Content-Security-Policy',policy);
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/((?!api(?:/|$)|media(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|images(?:/|$)|\\.well-known(?:/|$)|sitemap\\.xml$|robots\\.txt$|security\\.txt$|favicon\\.ico$|og\\.svg$).*)']};
