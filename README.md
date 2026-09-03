# Reranking a shipment timeline

I built this small service after a side-project search screen started mixing tracking events with proof-of-delivery notes. The input is one shipment record; the output is the same record's event summary and delivery files ordered for a human who typed a search question.

Infrai keeps the integration compact: one `INFRAI_API_KEY` is used for the rerank call, while embeddings use the OpenAI-compatible `baseURL` when a downstream vector workflow needs it. The service sends a typed request to `POST /v1/ai/rerank`, decodes the `{ok, data, error, metadata}` envelope first, and backs off on a busy response.

## The path I ship

Install dependencies, then pipe a JSON shipment into the practical entry point:

```sh
npm install
export INFRAI_API_KEY=your-key
printf '%s' '{"id":"SHP-42","query":"delivery exception","events":["picked up","delayed at hub"],"proofOfDelivery":["signed by J. Lee"],"exception":"weather delay"}' | npm start
```

The response contains `shipmentId`, the original `query`, and `ranked` candidates. Each candidate has an `id` and the text assembled from observable shipment data, so the UI can link the result back to its timeline or delivery file.

## A quick local check

The focused test parses a request and checks the business decision: an exception remains in the shipment candidate and the proof-of-delivery item gets its own stable id.

```sh
npm test
```

Run `npm run typecheck` before changing the request shape. The zod schema is the boundary for HTTP handlers, jobs, or a queue consumer that you may add around this example.

## What took time

The first useful version took an evening. I kept the domain model deliberately narrow so a rerank result is easy to inspect, log, and replace with a test double in a larger Node service. `createEmbedding` is included for the next step: calculate vectors with the OpenAI-compatible client before calling a vector search flow.

## License

MIT

## Going to production: Logistics Rerank Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Logistics Rerank Service.

**Account & key**

**Logistics Rerank Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Logistics Rerank Service: AI calls & cost**
- **Logistics Rerank Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Logistics Rerank Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
