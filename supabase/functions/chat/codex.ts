// ╭───────────────────────────────────────────────────────────────────╮
// │ codex.ts — talk to the ChatGPT subscription via the Codex backend │
// │                                                                   │
// │ Uses the same OAuth flow the official `codex` CLI uses: PKCE      │
// │ against auth.openai.com, then call chatgpt.com/backend-api with   │
// │ the Codex CLI's originator header. We hold the refresh token as   │
// │ a Supabase Function secret (OPENAI_CODEX_REFRESH_TOKEN) and       │
// │ exchange it for a fresh access token on demand.                   │
// │                                                                   │
// │ This is the OpenClaw-style integration. Personal-subscription     │
// │ use only — never expose this to other users.                      │
// ╰───────────────────────────────────────────────────────────────────╯

/** OAuth client (lifted from the official Codex CLI). */
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';

/** Codex backend. NOT api.openai.com — subscription traffic goes here. */
const CODEX_BASE = 'https://chatgpt.com/backend-api';
const CODEX_RESPONSES_PATH = '/codex/responses';

/** JWT claim path that holds the ChatGPT account id. */
const JWT_CLAIM_PATH = 'https://api.openai.com/auth';

export interface TokenSet {
  access: string;
  refresh: string;
  /** ms-since-epoch when the access token expires. */
  expiresAt: number;
  accountId: string;
}

/** Decode a JWT payload (no signature check — we trust OpenAI's response). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Extract `chatgpt_account_id` (or fallback `sub`) from a Codex access token. */
function extractAccountId(accessToken: string): string {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) throw new Error('Could not decode access token JWT');
  const auth = payload[JWT_CLAIM_PATH] as Record<string, unknown> | undefined;
  const id =
    (auth?.chatgpt_account_id as string | undefined) ??
    (auth?.account_id as string | undefined) ??
    (payload.sub as string | undefined);
  if (!id) throw new Error('No chatgpt_account_id claim in access token');
  return id;
}

/** Exchange a refresh token for a fresh access + refresh pair. */
export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OAuth refresh failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== 'number') {
    throw new Error('OAuth refresh response missing fields');
  }
  return {
    access: json.access_token,
    // OpenAI rotates refresh tokens — always store the latest one.
    refresh: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    accountId: extractAccountId(json.access_token),
  };
}

export interface CodexRequest {
  /** Model id (e.g. 'gpt-5.1', 'gpt-5.2-codex'). */
  model: string;
  /** Responses-API style input items. */
  input: unknown[];
  /** Optional tool definitions for tool use. */
  tools?: unknown[];
  /** Whether to stream (SSE). */
  stream?: boolean;
  /** Reasoning effort, instructions, etc. — passed through. */
  [k: string]: unknown;
}

/**
 * Call the Codex backend's Responses API with the access token.
 *
 * Returns the raw `Response` so the caller can stream the body straight back
 * to the browser if `stream: true`, or `await res.json()` for one-shot.
 */
export async function callCodex(
  tokens: TokenSet,
  req: CodexRequest,
  conversationId: string,
  sessionId: string,
): Promise<Response> {
  const url = `${CODEX_BASE}${CODEX_RESPONSES_PATH}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokens.access}`,
    // These three are what makes the request pass as a real Codex CLI client.
    'OpenAI-Beta': 'responses=experimental',
    originator: 'codex_cli_rs',
    'chatgpt-account-id': tokens.accountId,
    session_id: sessionId,
    conversation_id: conversationId,
    Accept: req.stream ? 'text/event-stream' : 'application/json',
  };
  return await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
}
