# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

- `recipe-book/` — the app (React 18 + TypeScript + Vite SPA). All commands run from here.
- `vv.md` — the original product brief.
- `misc/inspirataion/` — design reference images (FlipHTML5 cookbook/menu templates) the theme is modelled on. Not used by the build.
- `misc/drafts/` — static HTML mockups and their screenshots. They link `recipe-book/src/styles/theme.css` and the stock photos by relative path and open straight from disk; not used by the build.
- `misc/drafts/themes/` — the five theme candidates drawn up to replace the old amber theme (`index.html` is the gallery); Midnight & Copper was adopted into `theme.css`. Each is a token file layered with `base.css` over the real `theme.css` by `themes.js`; any draft page that includes `themes.js` takes `?theme=<id>`.

The workspace root is a git repository (branch `main`, no remote). `misc/inspirataion/` (1.1 GB of reference media) and `misc/MyRecordings/` are git-ignored and exist only on disk.

## Commands

Run from `recipe-book/`:

```
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc -b (type-check, noEmit) then vite build -> dist/
npm run preview  # serve the built dist/
```

There is no test runner and no linter. `npm run build` is the only check; `tsconfig.json` is `strict` with `noUnusedLocals` / `noUnusedParameters`, so unused imports and params fail the build.

## Backend services

The app is a frontend only. It talks to two separately-hosted HTTP services that must be running locally:

| Service | Default URL | Env override | Swagger |
| --- | --- | --- | --- |
| Auth | `http://127.0.0.1:5000` | `VITE_AUTH_URL` | `/docs` |
| Recipes | `http://127.0.0.1:5003` | `VITE_RECIPES_URL` | `/docs` |

Overrides live in `recipe-book/.env`. Each service serves its own swagger UI at `/docs` and the raw spec at `/swagger.json` (`vv.md` gives the auth URL for both; the recipes one is on `:5003`). The types in `src/api/types.ts` are hand-written mirrors of the two specs — when an endpoint shape is in doubt, fetch `/swagger.json` and update the types to match.

The frontend was last brought in line with the recipes spec on 2026-10-03: recipe categories cut to five, recipe `meal_types` and the `meal_type` filter on `/recipes`, a meal's `category` renamed `meal_type`, and a meal item's `course` renamed `category`. The spec also has `POST /meals/:id/copy`, a `recipe_id` filter on `/meals` and `/meals/catalog`, an `ingredient` filter on `/recipes` and `DELETE /ingredients/:id`; the frontend does not use those yet.

## Architecture

There is no global store and no data-fetching library. Auth is the only context; every page fetches its own data in `useEffect` (with a `cancelled` flag for cleanup) and holds it in local state.

### API layer (`src/api/`)

All network access goes through `request()` in `client.ts`; pages never call `fetch` directly. `auth.ts`, `recipes.ts` and `meals.ts` are thin objects (`authApi`, `recipesApi`, `mealsApi`) that map one method to one endpoint.

`client.ts` also owns the token store and the refresh flow:

- Access token: in memory, mirrored to `sessionStorage` (`rb.access`). Refresh token: `localStorage` (`rb.refresh`).
- Access tokens last 15 minutes. On a 401, `request()` calls `refreshTokens()` and retries once. Refresh tokens are single-use and replaying a used one signs out the whole login server-side, so `refreshTokens()` is single-flight — concurrent 401s share one in-flight promise. Keep it that way.
- If refresh fails, tokens are cleared and the handler registered via `setSessionExpiredHandler` fires (AuthContext uses it to null the user, which bounces to `/login`).
- Login sends `client: 'native'` so the refresh token comes back in the response body. The API's `web` cookie flow does not work from this app: the refresh cookie is `SameSite=Strict`, so it is only sent to a frontend served from the gateway's own origin.
- Logout and refresh send the *refresh* token as the bearer; pass it via the `token` option, which also disables the 401-retry path. Logout only revokes the refresh token — an issued access token stays valid until it expires, because the recipes service verifies tokens statelessly.
- Failures throw `ApiError` (`status`, `code`, `message`); `status === 0` means the server was unreachable. UI code turns these into text with `errorMessage()` from `components/Feedback.tsx`.

### Auth and routing

`AuthProvider` (`src/auth/AuthContext.tsx`) restores the session on load and exposes `user`, `ready`, `isAdmin` (role `admin`) through `useAuth()`. `ProtectedRoute` and `AdminRoute` in `components/Guards.tsx` gate the route tree in `App.tsx`: everything except `/login` requires a user, and `/admin` requires the admin role. Recipe edit permission (owner or admin) is checked client-side in `RecipeEditorPage` and `RecipePage` by comparing `recipe.owner_sub` to `user.id`; the meal pages do the same with `meal.owner_sub`.

Changing the password makes the auth service revoke every refresh token, so `AccountPage` calls `endSession()` and sends the user back to `/login` rather than keeping the session. The register form's checks (username `^[A-Za-z0-9_.-]{3,32}$`, password at least 10 characters) duplicate the auth service's rules.

The two services share only the user id: the recipes service stores `owner_sub` / `user_sub` and has no usernames. That is why other people's reviews render as `Cook <first 6 chars of sub>`.

### Welcome page and contents

`/` is `WelcomePage`, inside the `Shell` like every other page. It is a long scrolling page modelled on `misc/inspirataion/welcomePage.mp4`: a hero in which a book opens as you scroll: the hero starts behind the floating header, and a scroll listener sets `--open` (the cover swings round its spine in 3D, showing its inside as the left page and the title page with the buttons on the right) then `--grow` (the open spread fills the screen) on `.welcome-hero`, which the `welcome-book` CSS interpolates from. The front cover is one of four finished cover designs in `src/assets/covers/` (resized from `misc/inspirataion/covers/`; the title is part of the artwork), picked at random each time the page mounts and never the same one twice in a row (`localStorage` `rb.lastCover`); the pages are 2:3 to match them. On phones the right page stays centred and the cover swings away off-screen, an intro with a polaroid, a chapter collage, a copper ticker of the `CONTENTS` labels, alternating feature blocks (`FEATURES`, copy adapted from `vv.md`; keep it to things the app really does and leave admin features out), and a closing photo. `.reveal` elements fade in through an `IntersectionObserver`. Under `prefers-reduced-motion` the book is shown open and full-screen and nothing animates. The handwritten lines use `--font-script` (Parisienne).

The header and footer have no background on any page: the header is sticky and the pills (with their own fill) and the shadowed logo float over whatever scrolls beneath. The site-wide footer (`components/Footer.tsx`) credits the libraries and fonts the app uses in its `CREDITS` list. Add an entry when you add a runtime dependency or a font.

`ContentsPage` is a horizontal carousel of tall photo panels, one per chapter in `CONTENTS` (`components/categories.ts`), each opening the recipe browser: "All" (`/recipes`), the four meal times (`/recipes?meal_type=…`), then Drinks and Dessert by recipe category (`/recipes?category=…`). The track is a scroll-snap list; the arrows scroll it by one panel and are hidden on phones, where it is swiped. How many panels show is the `--shown` custom property on `.toc__track` (5, then 3, then 1.7). "All" shows a collage and Dessert a closer crop of the snacks photo, because there are only five stock photos. The header (`components/Header.tsx`, transparent, modelled on `misc/inspirataion/toolbar1 (1).png` / `(2).png`) has just three items: a Menu pill on the left, the logo in the centre (to `/`), and the user pill on the right, whose dropdown holds Account, Admin and Log out. There are no other nav links; `/menu` (`MenuPage`) is the hub, with two photo cards — Recipes (to `/contents`) and Meal plans (to `/meal-plans`). The contents page carries the New recipe button. `misc/drafts/welcome.html` and `contents-panels.html` repeat the two pages' markup against the real stylesheet, so they can be screenshotted without signing in — keep them in step when the markup changes. `welcome.html?p=0..1&y=N` fixes the book's progress (0 closed, 0.3 mid-flip, 0.58 open, 1 full-screen), shows every section and shifts the page up by N px, because headless Edge does not repaint after `scrollTo` and will not go narrower than about 490px.

### Home page state

`HomePage` is the recipe browser at `/recipes`. It keeps its filters in the URL query string (`category`, `meal_type`, `tag`, `q`, `scope`), not in component state — change filters through `updateParams`. `meal_type` goes into the shared `filters`, so it narrows the counts, the menu sections and the grid alike. Things to know:

- With no `category`, it renders a "menu" of per-category sections, each fetching its own first few recipes. With a `category`, it renders a paginated grid.
- The recipes API has no per-category count and cannot filter for "no category". Counts come from one `limit: 1` request per category reading `total`; the uncategorised view (`category=NONE`) fetches the first 200 and filters client-side.
- The meal-time chips, category list, scope switch and tag filter live in `BrowseSidebar`: a sticky left column above 860px, collapsed behind a "Filters" button below it (open state in `localStorage` `rb.filtersOpen`).

### Recipe page and interactions

- An "interaction" is the single per-user, per-recipe record holding the bookmark (`is_saved`), `rating` and `review_text`. Saving, rating and reviewing are all `PATCH /recipes/:id/interaction` with a partial body; the reviews list is other users' interactions. After a rating or review change the page refetches the recipe (for `rating_avg` / `rating_count`) and the first page of reviews.
- Ingredient scaling is done by the server, not in the client: the servings stepper refetches `GET /recipes/:id?servings=N` (debounced 250 ms) and replaces the recipe. `baseServings` keeps the original value for the "scaled for N" note.

### Recipe form

`RecipeForm` serves both create and edit and builds a full `RecipeWrite`:

- Blank ingredient rows and blank steps are dropped; step numbers are assigned by the server from array order.
- Empty nutrition fields are deleted from the payload rather than sent as `null`, so the API keeps its own values.
- Ingredients are a shared directory on the recipes service, created implicitly by recipe writes. A recipe write can only *add* tags to a shared ingredient, and only sets its `image_url` if it has none yet, so the form does not prefill a line's ingredient tags or image URL when editing and only sends what the user types; replacing them is admin-only, via the Ingredients panel on `/admin`.
- Meal times (`meal_types`) are a multi-select; the form sends them in `MEAL_TYPES` order.
- The form's limits (title 200, description 2000, 100 ingredients, 100 steps, servings 1–100, prep 0–1440, `http(s)` image URL) copy the API's validation.
- `TagInput` lowercases tags, truncates to 50 characters, caps the list at 20, and (unless `suggest={false}`) autocompletes from `GET /tags`. It is reused for user roles on the admin page.

### Meal plans

The UI calls them **meal plans**; the API, and the code (`Meal`, `mealsApi`, `MealPage`, `MealForm`…), still call them meals. Keep user-facing text saying "meal plan".

A meal plan is an ordered list of recipes, each with a `category` (a recipe category; the server defaults it to the recipe's own, else `MAIN`), `portions` per person and an optional `note`. The plan itself has an optional `meal_type`. Nutrition totals are computed by the server, per person.

- Routes: `/meal-plans` (`MealsPage`), `/meal-plans/new` and `/meal-plans/:id/edit` (`MealEditorPage` + `MealForm`), `/meal-plans/:id` (`MealPage`). Old `/meals/…` links redirect to the same path under `/meal-plans` (`MealsRedirect` in `App.tsx`).
- `MealsPage` keeps its filters in the URL like the recipe browser (`view=catalog|mine`, `meal_type`, `tag`, `q`, and `visibility` in the "mine" view). The catalog view reads `GET /meals/catalog` (public meals, featured first); "mine" reads `GET /meals`.
- Visibility is `PRIVATE` → `PENDING` → `PUBLIC`. New meals are private. The owner requests publication (`publish`, 409 if the meal has no items), an admin approves or rejects; a rejection returns it to `PRIVATE` with a `review_note`, which `MealPage` shows to the owner. `unpublish` (owner or admin) makes it private again and also withdraws a pending request. An owner's edit to a `PENDING` or `PUBLIC` meal sends it back to review, so the editor warns first.
- Someone else's private meal is a 404, not a 403.
- `MealForm` sends the whole `items` list on every save (the API replaces it) and caps it at 30. The same recipe may appear more than once. Its recipe picker searches by title and by recipe category (the chips), showing the first 8 matches. `MealPage` groups the dishes by item `category`.
- `MealPage`'s ingredient list is the server's shopping list, `GET /meals/:id/ingredients?people=N`: summed per ingredient and unit across the dishes, with different units of one ingredient on separate lines. The people stepper refetches it (debounced 250 ms), like recipe scaling. Each `MealItem` also carries its own per-person `ingredients`, which the page does not show.
- A recipe used in any meal cannot be deleted (409); `RecipePage` explains this.

### Admin page

`/admin` has three independent panels: users (auth service — edit roles, toggle `is_active`; you cannot deactivate yourself), meal plans (the pending queue via `GET /meals?all=true&visibility=PENDING` with approve/reject, and the public catalog with a featured switch and unpublish) and ingredients (recipes service — edit tags and image URL). The users and ingredients panels keep unsaved edits in a per-row `drafts` map and only show Save for rows with a draft; an ingredient save sends only the drafted fields, and an emptied image URL is sent as `null` to clear it.

### Categories and images

`components/categories.ts` is the single source for both lists, their labels and URL parsing, and for the contents chapters (`CONTENTS`). `CATEGORIES` is the recipe category, i.e. the course (`STARTER`, `MAIN`, `SIDE`, `DESSERT`, `DRINK`); a recipe has at most one, and it is also a meal plan item's `category`. `MEAL_TYPES` (`BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`) are the meal times: a recipe has any number (`meal_types`), a meal plan at most one (`meal_type`). A recipe may also have no category at all, which is the recipe browser's "Uncategorised" view.

`components/images.ts` picks a recipe's picture: its own `image_url`, else a bundled stock photo chosen by category, then by its first meal type, then by tag regex, then by `id` rotation. `mealImage` uses the meal plan's `image_url`, else its first dish's image, else a stock photo for its meal type. The stock photos live in `src/assets/`; there are only five, so several categories share one.

### Styling

One global stylesheet, `src/styles/theme.css` ("Midnight & Copper": dark navy with a copper `--accent`), driven by CSS custom properties on `:root` and BEM-style class names (`btn btn--primary`, `menu-section__title`). No CSS modules, no component library, no CSS-in-JS. Titles use `--font-serif` (Playfair Display) in sentence case; `--font-display` and `--font-body` are both Source Sans 3, the former for small tracked-caps labels and buttons. Fonts are loaded from Google Fonts in `index.html`. Colours go through the `:root` tokens, including `--scrim` for darkening over photos and `--accent-tint` for focus rings; avoid hard-coding colours.
