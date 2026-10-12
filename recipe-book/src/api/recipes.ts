import { RECIPES_URL, request } from './client';
import type {
  Category,
  Ingredient,
  IngredientUpdate,
  Interaction,
  InteractionUpdate,
  MealType,
  Page,
  Recipe,
  RecipeWrite,
  TagCount,
} from './types';

export interface RecipeQuery {
  limit?: number;
  offset?: number;
  q?: string;
  tag?: string;
  category?: Category;
  meal_type?: MealType;
  mine?: boolean;
  saved?: boolean;
}

export const recipesApi = {
  list: (query: RecipeQuery = {}) =>
    request<Page<Recipe>>(RECIPES_URL, '/recipes', {
      query: {
        ...query,
        mine: query.mine ? 'true' : undefined,
        saved: query.saved ? 'true' : undefined,
      },
    }),

  get: (id: number, servings?: number) =>
    request<Recipe>(RECIPES_URL, `/recipes/${id}`, { query: { servings } }),

  create: (data: RecipeWrite) =>
    request<Recipe>(RECIPES_URL, '/recipes', { method: 'POST', body: data }),

  update: (id: number, data: Partial<RecipeWrite>) =>
    request<Recipe>(RECIPES_URL, `/recipes/${id}`, { method: 'PATCH', body: data }),

  remove: (id: number) => request<null>(RECIPES_URL, `/recipes/${id}`, { method: 'DELETE' }),

  getInteraction: (id: number) =>
    request<Interaction>(RECIPES_URL, `/recipes/${id}/interaction`),

  updateInteraction: (id: number, data: InteractionUpdate) =>
    request<Interaction>(RECIPES_URL, `/recipes/${id}/interaction`, { method: 'PATCH', body: data }),

  deleteInteraction: (id: number) =>
    request<null>(RECIPES_URL, `/recipes/${id}/interaction`, { method: 'DELETE' }),

  reviews: (id: number, limit = 20, offset = 0) =>
    request<Page<Interaction>>(RECIPES_URL, `/recipes/${id}/reviews`, { query: { limit, offset } }),

  tags: (q?: string) => request<{ items: TagCount[] }>(RECIPES_URL, '/tags', { query: { q } }),

  ingredients: (query: { limit?: number; offset?: number; q?: string; tag?: string } = {}) =>
    request<Page<Ingredient>>(RECIPES_URL, '/ingredients', { query }),

  getIngredient: (id: number) => request<Ingredient>(RECIPES_URL, `/ingredients/${id}`),

  updateIngredient: (id: number, data: IngredientUpdate) =>
    request<Ingredient>(RECIPES_URL, `/ingredients/${id}`, { method: 'PATCH', body: data }),
};
