import { AUTH_URL, request, tokens } from './client';
import type {
  LoginInput,
  Message,
  Page,
  PasswordChange,
  RegisterInput,
  TokenPair,
  User,
  UserUpdate,
} from './types';

export const authApi = {
  health: () => request<{ status: string }>(AUTH_URL, '/health', { auth: false }),

  // "native" returns the refresh token in the body. The "web" cookie flow can't
  // work cross-origin because the API answers CORS with a wildcard origin.
  login: (input: LoginInput) =>
    request<TokenPair>(AUTH_URL, '/login', {
      method: 'POST',
      auth: false,
      body: { ...input, client: 'native' },
    }),

  register: (input: RegisterInput) =>
    request<User>(AUTH_URL, '/register', { method: 'POST', auth: false, body: input }),

  // Logout revokes the refresh token, so it is sent as the bearer.
  logout: () => {
    const rt = tokens.refresh;
    return request<Message>(AUTH_URL, '/logout', {
      method: 'POST',
      ...(rt ? { token: rt } : {}),
    });
  },

  me: () => request<User>(AUTH_URL, '/me'),

  changePassword: (input: PasswordChange) =>
    request<Message>(AUTH_URL, '/me/password', { method: 'POST', body: input }),

  listUsers: (limit = 50, offset = 0) =>
    request<Page<User>>(AUTH_URL, '/users', { query: { limit, offset } }),

  getUser: (id: string) => request<User>(AUTH_URL, `/users/${encodeURIComponent(id)}`),

  updateUser: (id: string, update: UserUpdate) =>
    request<User>(AUTH_URL, `/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: update }),
};
