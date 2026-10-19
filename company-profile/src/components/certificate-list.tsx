'use client';
import {useEffect,useState} from 'react';
import type {Dictionary,Locale} from '@/lib/content';
export type CertificateCard={id:string;name:string;issuer:string;number:string;expires:string;image?:string;alt?:string};
export function CertificateList({items,t,locale}:{items:CertificateCard[];t:Dictionary;locale:Locale}){
 const [now,setNow]=useState(0);useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const visible=items.filter(c=>Date.parse(c.expires+'T23:59:59+07:00')>=now);
 return visible.length?<div className="certificate-list">{visible.map(c=><article key={c.id}>{c.image&&<img src={c.image} alt={c.alt??c.name} width={600} height={450} loading="lazy"/>}<h2>{c.name}</h2><dl><dt>{t.ui.issuer}</dt><dd>{c.issuer}</dd><dt>{t.ui.number}</dt><dd>{c.number}</dd><dt>{t.ui.expired}</dt><dd><time dateTime={c.expires}>{new Intl.DateTimeFormat(locale==='id'?'id-ID':'en-GB',{dateStyle:'long',timeZone:'Asia/Jakarta'}).format(new Date(c.expires+'T12:00:00+07:00'))}</time></dd></dl></article>)}</div>:<p className="empty-state">{t.ui.empty}</p>;
}
