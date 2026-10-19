import type {Metadata} from 'next';
import {headers} from 'next/headers';
import '@fontsource/anton/latin-400.css';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import './globals.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={metadataBase:new URL('https://ubg.id')};
export default async function RootLayout({children}:{children:React.ReactNode}){const h=await headers();return <html lang={h.get('x-locale')==='en'?'en':'id'}><body>{children}</body></html>;}
