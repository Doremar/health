import http from "node:http";
import crypto from "node:crypto";
import { getAuth, saveAuth } from "./db.js";

const AUTH_BASE = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const SCOPES = [
  "read:recovery",
  "read:cycles",
  "read:sleep",
  "read:workout",
  "read:profile",
  "read:body_measurement",
  "offline",
].join(" ");

interface ClientCreds {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

function getCreds(): ClientCreds {
  const client_id = process.env.WHOOP_CLIENT_ID;
  const client_secret = process.env.WHOOP_CLIENT_SECRET;
  const redirect_uri = process.env.WHOOP_REDIRECT_URI ?? "http://localhost:8765/callback";
  if (!client_id || !client_secret) {
    throw new Error(
      "WHOOP_CLIENT_ID и WHOOP_CLIENT_SECRET обязательны. Получи их на https://developer.whoop.com → создай App с redirect URI " +
      redirect_uri
    );
  }
  return { client_id, client_secret, redirect_uri };
}

/**
 * Запускает OAuth flow: открывает локальный HTTP server, ждёт callback от Whoop,
 * обменивает code на токены, сохраняет в БД. Resolves когда получили токены.
 */
export async function runAuthorizationFlow(): Promise<void> {
  const { client_id, client_secret, redirect_uri } = getCreds();
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  console.log("\n=== Whoop OAuth ===");
  console.log("1. Открой эту ссылку в браузере:");
  console.log(`\n   ${url.toString()}\n`);
  console.log("2. Залогинься, разреши доступ.");
  console.log(`3. Браузер редиректнет на ${redirect_uri} — этот скрипт примет callback.\n`);

  const portMatch = redirect_uri.match(/:(\d+)\//);
  const port = portMatch ? Number(portMatch[1]) : 8765;

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url) return;
      const reqUrl = new URL(req.url, `http://localhost:${port}`);
      if (reqUrl.pathname !== "/callback") {
        res.writeHead(404).end("not found");
        return;
      }
      const code = reqUrl.searchParams.get("code");
      const returnedState = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
           .end(`<h1>Whoop вернул ошибку</h1><pre>${error}</pre>`);
        server.close();
        reject(new Error(`Whoop OAuth error: ${error}`));
        return;
      }
      if (!code) {
        res.writeHead(400).end("no code");
        return;
      }
      if (returnedState !== state) {
        res.writeHead(400).end("state mismatch");
        server.close();
        reject(new Error("state mismatch — возможная CSRF атака"));
        return;
      }

      try {
        await exchangeCodeForToken(code, { client_id, client_secret, redirect_uri });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
           .end(`<!doctype html><html><body style="font-family:sans-serif;padding:40px;background:#0a0e1a;color:#f4f6fb">
             <h1>✓ Готово</h1>
             <p>Whoop подключён. Можешь закрыть эту вкладку и вернуться в терминал.</p>
             </body></html>`);
        server.close();
        resolve();
      } catch (e) {
        res.writeHead(500).end(`token exchange failed: ${(e as Error).message}`);
        server.close();
        reject(e);
      }
    });
    server.listen(port, () => {
      console.log(`[oauth] callback listener on http://localhost:${port}/callback ...`);
    });
    server.on("error", reject);

    // Таймаут 5 минут
    setTimeout(() => {
      server.close();
      reject(new Error("Timeout: 5 минут ожидания callback"));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForToken(code: string, creds: ClientCreds): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    redirect_uri: creds.redirect_uri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  saveAuth({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    scope: data.scope,
  });
  console.log(`[oauth] токены сохранены, expires_at=${expiresAt}`);
}

async function refreshIfNeeded(): Promise<string> {
  const auth = getAuth();
  if (!auth) throw new Error("Не подключено. Запусти `whoop auth` сначала.");
  const expiresAt = new Date(auth.expires_at).getTime();
  // Refresh за 60 сек до истечения
  if (Date.now() < expiresAt - 60_000) return auth.access_token;

  const creds = getCreds();
  console.log("[oauth] refresh access_token...");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: auth.refresh_token,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    scope: SCOPES,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`refresh ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  saveAuth({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: newExpiresAt,
    scope: data.scope,
  });
  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  return refreshIfNeeded();
}
