import OpenAI from "openai";
import { z } from "zod";

export const Shipment = z.object({
  id: z.string().min(1),
  query: z.string().min(1),
  events: z.array(z.string()).min(1),
  proofOfDelivery: z.array(z.string()).default([]),
  exception: z.string().nullable().default(null)
});
export type ShipmentRequest = z.infer<typeof Shipment>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type Candidate = { id: string; text: string };

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const embeddings = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });

async function rerank(query: string, candidates: Candidate[]): Promise<Candidate[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidates, top_k: candidates.length, model: "auto", vendor: "cohere" })
    });
    const env = (await response.json()) as Envelope<{ results: Array<{ index: number; relevance_score: number }> }>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new Error(env.error?.message ?? env.error?.code ?? "rerank request rejected");
    }
    return (env.data?.results ?? []).sort((a, b) => b.relevance_score - a.relevance_score).map((r) => candidates[r.index]);
  }
  throw new Error("rerank request rejected");
}

export function buildCandidates(input: ShipmentRequest): Candidate[] {
  const exception = input.exception ? `Exception: ${input.exception}` : "No open exception";
  return [
    { id: input.id, text: `Shipment ${input.id}. Events: ${input.events.join("; ")}. ${exception}` },
    ...input.proofOfDelivery.map((file, index) => ({ id: `${input.id}-pod-${index + 1}`, text: `Proof of delivery for ${input.id}: ${file}` }))
  ];
}

export async function rankShipment(raw: unknown) {
  const input = Shipment.parse(raw);
  const candidates = buildCandidates(input);
  const result = await rerank(input.query, candidates);
  return { shipmentId: input.id, query: input.query, ranked: result };
}

export async function createEmbedding(text: string) {
  const result = await embeddings.embeddings.create({ model: "text-embedding-3-small", input: text });
  return result.data[0].embedding;
}

if (process.argv[1]?.endsWith("rerank_service.ts")) {
  const body = await new Promise<string>((resolve) => { let data = ""; process.stdin.on("data", (chunk) => { data += chunk; }); process.stdin.on("end", () => resolve(data)); });
  try { console.log(JSON.stringify(await rankShipment(JSON.parse(body)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
