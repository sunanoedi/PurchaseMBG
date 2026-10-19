'use client';
import {useRef,useState} from 'react';
import type {Dictionary} from '@/lib/content';
export type GalleryPhoto={src:string;alt:string;category:'dapur'|'tim'|'hidangan'|'acara';placeholder:boolean};
export function Gallery({items,t}:{items:GalleryPhoto[];t:Dictionary}){
 const [category,setCategory]=useState('all'),[index,setIndex]=useState(0);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement|null>(null);
 const filtered=items.filter(item=>category==='all'||item.category===category);const active=filtered[index];
 function close(){dialog.current?.close();trigger.current?.focus();}
 function move(direction:number){setIndex(i=>(i+direction+filtered.length)%filtered.length);}
 return <><div className="filters" aria-label={t.nav.gallery}>{(['all','dapur','tim','hidangan','acara'] as const).map(key=><button type="button" key={key} aria-pressed={category===key} onClick={()=>{setCategory(key);setIndex(0);}}>{t.ui[key]}</button>)}</div><div className="gallery-grid">{filtered.map((item,i)=><button type="button" key={item.src+i} className="gallery-tile" aria-label={`${t.ui.openImage}: ${item.alt}`} onClick={e=>{trigger.current=e.currentTarget;setIndex(i);dialog.current?.showModal();}}><img src={item.src} alt={item.alt} width={800} height={650} loading="lazy"/>{item.placeholder&&<span>{t.ui.placeholder}</span>}</button>)}</div><dialog ref={dialog} className="lightbox" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);}}><button type="button" className="dialog-close" aria-label={t.ui.close} onClick={close}>×</button>{active&&<><img src={active.src} alt={active.alt}/><p>{active.alt}</p><div className="lightbox-controls"><button type="button" aria-label={t.ui.previous} onClick={()=>move(-1)}>←</button><span aria-live="polite">{index+1} / {filtered.length}</span><button type="button" aria-label={t.ui.next} onClick={()=>move(1)}>→</button></div></>}</dialog></>;
}
