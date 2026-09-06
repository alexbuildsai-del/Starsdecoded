import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";

function getSecret(): string {
  const s = process.env.INVITE_TOKEN_SECRET ?? process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // In production we refuse to mint or verify tokens with a default
  // secret — it would let anyone forge invite links. Operators must
  // configure INVITE_TOKEN_SECRET (>= 16 chars) before serving prod
  // traffic.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "INVITE_TOKEN_SECRET (>= 16 chars) is required in production",
    );
  }
  return "dev-invite-token-secret-change-me-in-prod-0123456789";
}

function sign(nonce: string): string {
  return createHmac("sha256", getSecret()).update(nonce).digest("base64url");
}

export function mintInviteToken(): { token: string; tokenHash: string } {
  const nonce = randomBytes(18).toString("base64url");
  const sig = sign(nonce);
  const token = `${nonce}.${sig}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function verifyInviteToken(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const nonce = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  const expected = sign(nonce);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return createHash("sha256").update(raw).digest("hex");
}
