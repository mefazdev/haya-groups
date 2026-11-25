import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "estimates_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, so staff rarely sign in again.

export interface LoginState {
  error?: string;
  username?: string;
}

const credentials = () => {
  const username = process.env.ESTIMATES_USERNAME;
  const password = process.env.ESTIMATES_PASSWORD;
  return username && password ? { username, password } : null;
};

const digest = (value: string) => createHash("sha256").update(value).digest();
const isSame = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// Keyed on the credentials, so changing the password signs everyone out.
const sign = (expires: string, { username, password }: NonNullable<ReturnType<typeof credentials>>) =>
  createHmac("sha256", `${username}\0${password}`).update(expires).digest("base64url");

export const isAuthConfigured = () => credentials() !== null;

export const credentialsMatch = (username: string, password: string) => {
  const expected = credentials();
  if (!expected) return false;
  const usernameMatches = isSame(username, expected.username);
  const passwordMatches = isSame(password, expected.password);
  return usernameMatches && passwordMatches;
};

export const createSessionToken = () => {
  const expected = credentials();
  if (!expected) throw new Error("Estimate login is not configured");
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE);
  return `${expires}.${sign(expires, expected)}`;
};

export const isValidSession = (token: string | undefined) => {
  const expected = credentials();
  if (!expected || !token) return false;
  const [expires, signature, ...rest] = token.split(".");
  if (!expires || !signature || rest.length > 0) return false;
  return Number(expires) > Date.now() / 1000 && isSame(signature, sign(expires, expected));
};

export const clearSessionCookieHeaders = () => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `${SESSION_COOKIE}=; Path=/estimates; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`,
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`,
  ];
};
