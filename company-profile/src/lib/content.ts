import id from '../../content/id.json';
import en from '../../content/en.json';
export type Locale = 'id' | 'en';
export type Dictionary = typeof id;
export type PageKey = keyof Dictionary['nav'];
export const locales: Locale[] = ['id','en'];
export const dictionary = (locale: Locale): Dictionary => locale==='en'?en:id;
export function href(locale: Locale,key: PageKey,slug?: string) {
  return `/${locale}${dictionary(locale).paths[key]?'/'+dictionary(locale).paths[key]:''}${slug?'/'+encodeURIComponent(slug):''}`;
}
export function pageKey(locale: Locale,segments: string[]): PageKey | null {
  if(!segments.length)return 'home';
  return (Object.keys(dictionary(locale).paths) as PageKey[]).find(key=>dictionary(locale).paths[key]===segments[0])??null;
}
