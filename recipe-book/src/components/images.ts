import breakfast from '../assets/breakfast.jpg';
import lunch from '../assets/lunch.jpg';
import dinner from '../assets/dinner.jpg';
import drink from '../assets/drink.jpg';
import snacks from '../assets/snacks.jpg';
import { categoryInfo, mealTypeInfo } from './categories';

export const photos = { breakfast, lunch, dinner, drink, snacks };

const byTag: [RegExp, string][] = [
  [/breakfast|brunch|pancake|smoothie|bowl/, breakfast],
  [/drink|beverage|cocktail|juice|tea|coffee/, drink],
  [/snack|dessert|sweet|bak|cake|cookie|side/, snacks],
  [/lunch|salad|sandwich|soup|light/, lunch],
  [/dinner|main|steak|meat|beef|chicken|stew|one-pot/, dinner],
];
const rotation = [dinner, lunch, breakfast, snacks, drink];

/** The recipe's own image, or a stock photo chosen from its category, meal times or tags. */
export function recipeImage(r: {
  id: number;
  image_url?: string | null;
  category?: string | null;
  meal_types?: string[];
  tags?: string[];
}): string {
  if (r.image_url) return r.image_url;
  const cat = categoryInfo(r.category);
  if (cat) return cat.photo;
  const mealType = mealTypeInfo(r.meal_types?.[0]);
  if (mealType) return mealType.photo;
  const tags = (r.tags ?? []).join(' ');
  for (const [re, img] of byTag) if (re.test(tags)) return img;
  return rotation[r.id % rotation.length];
}

/** The meal plan's own image, else its first dish's, else a stock photo for its meal type. */
export function mealImage(m: {
  id: number;
  image_url?: string | null;
  meal_type?: string | null;
  items?: { recipe_image_url?: string | null }[];
}): string {
  if (m.image_url) return m.image_url;
  const fromItem = m.items?.find((i) => i.recipe_image_url)?.recipe_image_url;
  if (fromItem) return fromItem;
  return mealTypeInfo(m.meal_type)?.photo ?? rotation[m.id % rotation.length];
}

export function fallbackImage(id: number): string {
  return rotation[id % rotation.length];
}
