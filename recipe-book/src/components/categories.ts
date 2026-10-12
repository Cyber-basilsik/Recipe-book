import type { Category, MealType } from '../api/types';
import breakfast from '../assets/breakfast.jpg';
import dinner from '../assets/dinner.jpg';
import drink from '../assets/drink.jpg';
import lunch from '../assets/lunch.jpg';
import snacks from '../assets/snacks.jpg';

export interface CategoryInfo {
  value: Category;
  label: string;
  plural: string;
  photo: string;
}

/** Recipe categories: the course a recipe usually is. Also the categories of a meal plan's items. */
export const CATEGORIES: CategoryInfo[] = [
  { value: 'STARTER', label: 'Starter', plural: 'Starters', photo: lunch },
  { value: 'MAIN', label: 'Main', plural: 'Mains', photo: dinner },
  { value: 'SIDE', label: 'Side', plural: 'Sides', photo: lunch },
  { value: 'DESSERT', label: 'Dessert', plural: 'Desserts', photo: snacks },
  { value: 'DRINK', label: 'Drink', plural: 'Drinks', photo: drink },
];

/** Special URL value for recipes that have no category. */
export const UNCATEGORISED = 'NONE';

const byValue = new Map(CATEGORIES.map((c) => [c.value, c]));

export function categoryInfo(value?: string | null): CategoryInfo | undefined {
  return value ? byValue.get(value.toUpperCase() as Category) : undefined;
}

export function categoryLabel(value?: string | null): string {
  return categoryInfo(value)?.label ?? '';
}

/** Normalise a URL value to a Category, 'NONE', or null (all). */
export function parseCategory(raw: string | null): Category | typeof UNCATEGORISED | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  if (up === UNCATEGORISED) return UNCATEGORISED;
  return byValue.has(up as Category) ? (up as Category) : null;
}

export interface MealTypeInfo {
  value: MealType;
  label: string;
  plural: string;
  photo: string;
}

/** Meal types: the meal times a recipe suits, and what a meal plan is for. */
export const MEAL_TYPES: MealTypeInfo[] = [
  { value: 'BREAKFAST', label: 'Breakfast', plural: 'Breakfast', photo: breakfast },
  { value: 'LUNCH', label: 'Lunch', plural: 'Lunch', photo: lunch },
  { value: 'DINNER', label: 'Dinner', plural: 'Dinner', photo: dinner },
  { value: 'SNACK', label: 'Snack', plural: 'Snacks', photo: snacks },
];

const mealTypeByValue = new Map(MEAL_TYPES.map((t) => [t.value, t]));

export function mealTypeInfo(value?: string | null): MealTypeInfo | undefined {
  return value ? mealTypeByValue.get(value.toUpperCase() as MealType) : undefined;
}

export interface ContentsEntry {
  label: string;
  /** The recipe list this chapter opens. */
  to: string;
  /** One photo, or several shown as a collage. */
  photos: string[];
  /** Crop in closer, for a chapter that shares its photo with another. */
  zoom?: boolean;
}

/** Chapters of the contents page: every recipe, the meal times, then drinks and desserts by category. */
export const CONTENTS: ContentsEntry[] = [
  { label: 'All', to: '/recipes', photos: [breakfast, lunch, dinner, drink] },
  ...MEAL_TYPES.map((t) => ({ label: t.plural, to: `/recipes?meal_type=${t.value}`, photos: [t.photo] })),
  { label: 'Drinks', to: '/recipes?category=DRINK', photos: [drink] },
  // There is no dessert photo; it borrows the snacks one.
  { label: 'Dessert', to: '/recipes?category=DESSERT', photos: [snacks], zoom: true },
];
