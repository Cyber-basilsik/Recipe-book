// Types mirror the swagger definitions of the auth (:5000) and recipes (:5003) services.

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---- Auth ----
export interface User {
  id: string;
  username: string;
  email?: string | null;
  roles: string[];
  is_active: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

export interface TokenPair {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface LoginInput {
  username: string;
  password: string;
  client?: 'web' | 'native';
}

export interface RegisterInput {
  username: string;
  password: string;
  email?: string | null;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface UserUpdate {
  roles?: string[];
  is_active?: boolean;
}

export interface Message {
  message: string;
}

// ---- Recipes ----
/** A recipe's category (its course), and a meal item's category. */
export type Category = 'STARTER' | 'MAIN' | 'SIDE' | 'DESSERT' | 'DRINK';
/** The meal times a recipe suits, and a meal plan's type. */
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface RecipeIngredient {
  ingredient_id: number;
  name: string;
  tags: string[];
  image_url?: string | null;
  quantity: number;
  unit: string;
}

export interface Instruction {
  step_number: number;
  instruction_text: string;
}

export interface Recipe {
  id: number;
  owner_sub: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: Category | null;
  meal_types: MealType[];
  servings: number;
  prep_minutes: number;
  tags: string[];
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ingredients: RecipeIngredient[];
  instructions: Instruction[];
  rating_avg: number | null;
  rating_count: number;
}

export interface IngredientLine {
  name: string;
  quantity: number;
  unit: string;
  tags?: string[];
  image_url?: string | null;
}

export interface RecipeWrite {
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: Category | null;
  meal_types?: MealType[];
  servings?: number;
  prep_minutes?: number;
  tags?: string[];
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  ingredients?: IngredientLine[];
  instructions?: { instruction_text: string }[];
}

export interface Interaction {
  id: number;
  user_sub: string;
  recipe_id: number;
  is_saved: boolean;
  rating: number | null;
  review_text: string | null;
  updated_at: string;
}

export interface InteractionUpdate {
  is_saved?: boolean;
  rating?: number | null;
  review_text?: string | null;
}

export interface Ingredient {
  id: number;
  name: string;
  tags: string[];
  image_url?: string | null;
}

export interface IngredientUpdate {
  tags?: string[];
  image_url?: string | null;
}

export interface TagCount {
  tag: string;
  recipes: number;
  ingredients: number;
}

// ---- Meals (shown as "meal plans") ----
export type MealVisibility = 'PRIVATE' | 'PENDING' | 'PUBLIC';

export interface MealIngredient {
  ingredient_id: number;
  name: string;
  tags: string[];
  image_url?: string | null;
  quantity: number;
  unit: string;
}

export interface MealItem {
  position: number;
  recipe_id: number;
  recipe_title: string;
  recipe_category?: Category | null;
  recipe_meal_types: MealType[];
  recipe_image_url?: string | null;
  /** Defaults to the recipe's category, else MAIN. */
  category: Category;
  note?: string | null;
  portions: number;
  /** The recipe's ingredients for this item's portions, per person. */
  ingredients: MealIngredient[];
}

export interface MealShoppingLine extends MealIngredient {
  /** Recipes in the meal that use it. */
  recipe_ids: number[];
}

export interface MealShoppingList {
  meal_id: number;
  people: number;
  items: MealShoppingLine[];
}

export interface Meal {
  id: number;
  owner_sub: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  meal_type?: MealType | null;
  tags: string[];
  items: MealItem[];
  visibility: MealVisibility;
  is_featured: boolean;
  review_note?: string | null;
  published_at?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
}

export interface MealItemInput {
  recipe_id: number;
  category?: Category;
  note?: string | null;
  portions?: number;
}

export interface MealWrite {
  title: string;
  description?: string | null;
  image_url?: string | null;
  meal_type?: MealType | null;
  tags?: string[];
  items?: MealItemInput[];
}
