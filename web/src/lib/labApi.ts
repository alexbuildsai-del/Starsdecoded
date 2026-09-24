/**
 * The admin Lab page's one door to /api/admin/lab (annex scope 5). The
 * routes sit outside openapi.yaml like /admin/prompts, so their shapes are
 * typed here and nowhere else in the web app. Runs, Spawn and the session
 * list carry numbers only; text arrives only when a card opens (ADR-75).
 */
import { BASE_URL } from "@/lib/api";

export class LabApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly body: Record<string, unknown>) {
    super(message);
    this.name = "LabApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}admin/lab${path}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new LabApiError(res.status, String(body.error ?? "error"), String(body.message ?? `HTTP ${res.status}`), body);
  return body as T;
}

export type ServiceTier = "flex" | "standard";

/** One section of one run, numbers only. */
export interface LabRunRow {
  id: string;
  runKey: string;
  fixture: string;
  label: string;
  source: "lab" | "replay" | "report";
  section: string;
  model: string;
  reasoningEffort: string | null;
  serviceTier: ServiceTier;
  status: "queued" | "running" | "done" | "failed";
  error: string | null;
  words: number;
  costUsd: number | null;
  seconds: number | null;
  faults: string[];
  sessionId: string | null;
  createdAt: string;
  subjectName: string | null;
}

export interface RunsResponse {
  runs: LabRunRow[];
  labels: string[];
}

export interface CompareRow {
  section: string;
  model: [string, string];
  words: [number, number];
  costUsd: [number | null, number | null];
  seconds: [number, number];
  faults: [string[], string[]];
  verdict: string;
}

export interface CompareResponse {
  a: string;
  b: string;
  rows: CompareRow[];
  costUsd: [number | null, number | null];
  worse: string[];
  better: string[];
}

export interface SpendResponse {
  month: string;
  spentUsd: number;
  budgetUsd: number;
  runs: number;
}

export interface CatalogueEntry {
  id: string;
  input: number;
  cachedInput: number;
  output: number;
  reasoningEffort: string;
  flex: boolean;
  checked: string;
}

export interface EstimateRequest {
  bases: string[];
  sections: string[];
  writers: string[];
  control: boolean;
}

export interface EstimateResponse {
  cards: number;
  standardUsd: number;
  flexUsd: number;
  spentUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  perWriter: Array<{ writer: string; standardUsd: number; flexUsd: number; replays: number }>;
}

export interface SessionSummary {
  id: string;
  label: string;
  createdAt: string;
  cards: number;
  judged: number;
  ready: boolean;
  revealedAt: string | null;
}

export interface SessionCardSummary {
  id: string;
  index: number;
  fixture: string;
  section: string;
  judged: boolean;
}

export interface SessionDetail extends SessionSummary {
  cards: number;
  list: SessionCardSummary[];
  pending: Array<{ runKey: string; section: string; status: string; error: string | null }>;
}

export interface Picks {
  best: number[];
  notShip: number[];
  same: number[][];
}

export interface CardDetail {
  id: string;
  sessionId: string;
  index: number;
  fixture: string;
  section: string;
  variants: Array<{ letter: string; text: unknown }>;
  picks: Picks | null;
  note: string | null;
  judgedAt: string | null;
}

export interface WriterTally {
  best: number;
  tied: number;
  notShip: number;
  cards: number;
}

export interface RevealWriter {
  writer: string;
  serviceTier: ServiceTier;
  bySection: Record<string, WriterTally>;
  byTier: Record<string, WriterTally>;
  total: WriterTally;
  faults: number;
  words: number;
  costUsd: number;
}

export interface RevealMix {
  mix: string;
  description: string;
  costUsd: number | null;
  worseThanBaseline: string[];
}

export interface RevealResponse {
  sessionId: string;
  label: string;
  writers: RevealWriter[];
  mixes: RevealMix[];
  control: { cards: number; agree: number; rate: number | null };
  dropped: Array<{ fixture: string; section: string; writer: string; error: string | null }>;
  cards: Array<{ id: string; fixture: string; section: string; letters: Record<string, string>; picks: Picks | null; note: string | null }>;
}

export const labApi = {
  runs: (label?: string) => call<RunsResponse>(`/runs${label ? `?label=${encodeURIComponent(label)}` : ""}`),
  compare: (a: string, b: string) => call<CompareResponse>(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  spend: () => call<SpendResponse>("/spend"),
  catalogue: () => call<{ models: CatalogueEntry[]; baseline: string }>("/catalogue"),
  estimate: (body: EstimateRequest) => call<EstimateResponse>("/sessions/estimate", { method: "POST", body: JSON.stringify(body) }),
  spawn: (body: EstimateRequest & { label: string; serviceTier: ServiceTier }) =>
    call<{ sessionId: string; cards: number; replays: number }>("/sessions", { method: "POST", body: JSON.stringify(body) }),
  sessions: () => call<{ sessions: SessionSummary[] }>("/sessions"),
  session: (id: string) => call<SessionDetail>(`/sessions/${encodeURIComponent(id)}`),
  card: (sessionId: string, cardId: string) => call<CardDetail>(`/sessions/${encodeURIComponent(sessionId)}/cards/${encodeURIComponent(cardId)}`),
  judge: (sessionId: string, cardId: string, body: { picks: Picks; note: string }) =>
    call<{ ok: true }>(`/sessions/${encodeURIComponent(sessionId)}/cards/${encodeURIComponent(cardId)}`, { method: "PUT", body: JSON.stringify(body) }),
  reveal: (sessionId: string) => call<RevealResponse>(`/sessions/${encodeURIComponent(sessionId)}/reveal`),
};

/** The admin's own reports, listed by id and name; no birth data leaves the list route unread. */
export async function myReports(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${BASE_URL}reports`, { credentials: "include" });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ id: string; name: string; kind: string; status: string }>;
  return rows.filter((r) => r.kind === "natal" && r.status === "complete").map((r) => ({ id: r.id, name: r.name }));
}

export const usd = (n: number | null | undefined): string => (n === null || n === undefined ? "-" : `$${n.toFixed(4)}`);
export const cents = (n: number | null | undefined): string => (n === null || n === undefined ? "-" : `${(n * 100).toFixed(1)} ¢`);
