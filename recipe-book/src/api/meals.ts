import { RECIPES_URL, request } from './client';
import type { Meal, MealType, MealShoppingList, MealVisibility, MealWrite, Page } from './types';

export interface MealQuery {
  limit?: number;
  offset?: number;
  q?: string;
  tag?: string;
  meal_type?: MealType;
  visibility?: MealVisibility;
  all?: boolean;
}

export interface CatalogQuery {
  limit?: number;
  offset?: number;
  q?: string;
  tag?: string;
  meal_type?: MealType;
  featured?: boolean;
}

export const mealsApi = {
  /** Your own meals; admins can pass `all` to see everyone's. */
  list: (query: MealQuery = {}) =>
    request<Page<Meal>>(RECIPES_URL, '/meals', { query: { ...query, all: query.all ? 'true' : undefined } }),

  /** Every public meal, featured first. */
  catalog: (query: CatalogQuery = {}) =>
    request<Page<Meal>>(RECIPES_URL, '/meals/catalog', {
      query: { ...query, featured: query.featured ? 'true' : undefined },
    }),

  get: (id: number) => request<Meal>(RECIPES_URL, `/meals/${id}`),

  /** Shopping list: the meal's ingredients summed per ingredient and unit, for `people` people. */
  ingredients: (id: number, people?: number) =>
    request<MealShoppingList>(RECIPES_URL, `/meals/${id}/ingredients`, { query: { people } }),

  create: (data: MealWrite) => request<Meal>(RECIPES_URL, '/meals', { method: 'POST', body: data }),

  update: (id: number, data: Partial<MealWrite>) =>
    request<Meal>(RECIPES_URL, `/meals/${id}`, { method: 'PATCH', body: data }),

  remove: (id: number) => request<null>(RECIPES_URL, `/meals/${id}`, { method: 'DELETE' }),

  publish: (id: number) => request<Meal>(RECIPES_URL, `/meals/${id}/publish`, { method: 'POST' }),

  unpublish: (id: number) => request<Meal>(RECIPES_URL, `/meals/${id}/unpublish`, { method: 'POST' }),

  approve: (id: number) => request<Meal>(RECIPES_URL, `/meals/${id}/approve`, { method: 'POST' }),

  reject: (id: number, note: string | null) =>
    request<Meal>(RECIPES_URL, `/meals/${id}/reject`, { method: 'POST', body: { note } }),

  setFeatured: (id: number, is_featured: boolean) =>
    request<Meal>(RECIPES_URL, `/meals/${id}/featured`, { method: 'PATCH', body: { is_featured } }),
};
