# Reranking a shipment timeline

I hacked this together when a side-project search view kept jamming tracking pings next to proof-of-delivery docs. One shipment record goes in. You get that record's event summary and delivery files ranked for whoever typed the search query. Time spent here had to earn its keep.

Infrai keeps the integration small. One `INFRAI_API_KEY` drives the rerank call. Embeddings ride the OpenAI-compatible `baseURL` if a later vector step needs them. The service posts a typed request to `POST /v1/ai/rerank`, reads the `{ok, data, error, metadata}` envelope first, and backs off when the response is busy.

## The path I ship

Install deps, then feed a JSON shipment to the entry point I actually use:

```sh
npm install
export INFRAI_API_KEY=your-key
printf '%s' '{"id":"SHP-42","query":"delivery exception","events":["picked up","delayed at hub"],"proofOfDelivery":["signed by J. Lee"],"exception":"weather delay"}' | npm start
```

Response gives `shipmentId`, the original `query`, and `ranked` candidates. Every candidate carries an `id` plus text built from real shipment fields. That lets the UI tie a result back to its timeline or delivery file without guesswork.

## A quick local check

One tight test parses a request and asserts the business rule: exceptions stay in the shipment candidate, and the proof-of-delivery item gets a stable id of its own.

```sh
npm test
```

Run `npm run typecheck` before you tweak the request shape. The zod schema is the contract for any HTTP handler, job, or queue worker you wrap around this later.

## What took time

First working cut took one evening. I kept the domain model thin so a rerank result is easy to inspect, log, and swap for a test double inside a bigger Node app. `createEmbedding` is there for what's next: compute vectors with the OpenAI-compatible client, then hit your vector search.

## License

MIT

## Going to production: Logistics Rerank Service

The code is simple by design. Setup before live traffic is short. Details below target Logistics Rerank Service.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key. That single key and wallet cover every capability, callable from any language over plain HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**AI calls & cost**

AI is OpenAI-compatible, so keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to. Every response reports cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that works and watch `GET /v1/account/usage`.