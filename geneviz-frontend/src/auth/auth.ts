// src/auth/auth.ts
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

const TOKEN_KEY = "geneviz_token";

export type LoginPayload = { username: string; password: string };
export type LoginResponse = { token: string };

export async function login({ username, password }: LoginPayload): Promise<string> {
  const { data } = await api.post<LoginResponse>(
    endpoints.login, // ← was endpoints.token
    new URLSearchParams({ username, password }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const token = data.token;
  setToken(token);
  return token;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // attach to axios instance for all future calls
  api.defaults.headers.common.Authorization = `Token ${token}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common.Authorization;
}

export function initAuthFromStorage() {
  const t = getToken();
  if (t) api.defaults.headers.common.Authorization = `Token ${t}`;
  return t;
}

export function hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
