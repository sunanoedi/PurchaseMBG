import type {Locale} from '../src/lib/content';
// TODO: Replace each illustration with approved client/company photography and update both alt texts in JSON.
export const images={
  meal:{src:'/images/meal.svg',placeholder:true,altKey:'meal'},
  kitchen:{src:'/images/kitchen.svg',placeholder:true,altKey:'kitchen'},
  team:{src:'/images/team.svg',placeholder:true,altKey:'team'},
  event:{src:'/images/event.svg',placeholder:true,altKey:'event'},
  director:{src:'/images/director.svg',placeholder:true,altKey:'director'},
} as const;
export type ImageKey=keyof typeof images;
export type ImageLocale=Locale;
