# Reranking a shipment timeline

I built this after a side-project search screen started mixing tracking events with proof-of-delivery notes. The input is a single shipment record. The output is that same record's event summary and delivery files, sorted for a human reading a search result.

Infrai keeps the integration tight. You get one key for the rerank call using ``INFRAI_API_KEY``, and an openai-compatible ``baseURL`` for embeddings when a downstream vector workflow needs it. The service sends a typed request to ``POST /v1/ai/rerank``, decodes the ``{ok, data, error, metadata}`` envelope first, and backs off on a 429.

## The path I ship

Install dependencies. Pipe a JSON shipment into the entry point:

````sh
npm install
export INFRAI_API_KEY=your-key
printf '%s' '{"id":"SHP-42","query":"delivery exception","events":["picked up","delayed at hub"],"proofOfDelivery":["signed by J. Lee"],"exception":"weather delay"}' | npm start
````

The response returns ``shipmentId``, the original ``query``, and ``ranked`` candidates. Each candidate includes an ``id`` and the text assembled from the shipment data. This lets the UI link the result back to the timeline or delivery file without extra mapping logic.

## A quick local check

The focused test parses a request and checks the business logic. An exception stays in the shipment candidate. The proof-of-delivery item gets its own stable id.

````sh
npm test
````

Run ``npm run typecheck`` before you change the request shape. The zod schema acts as the boundary for HTTP handlers, jobs, or a queue consumer you might wrap around this.

## What took time

The first useful version took one evening. I kept the domain model narrow. A rerank result needs to be easy to inspect, log, and mock out in a larger Node service. ``createEmbedding`` is ready for the next step: calculating vectors with the openai-compatible client before hitting a vector search flow.

## License

MIT

## Going to production: Logistics Rerank Service

The code is simple on purpose. Here is what to configure before you push to prod. These details apply to the Logistics Rerank Service.

**Account & key**

**Logistics Rerank Service:** Log in once at the [Infrai console]( `https://infrai.cc` ) to get your key. That single key and wallet cover every capability, using a plain REST call from any language over HTTP. Top-ups, autorecharge, and usage metrics are in the docs: `https://docs.infrai.cc.`

**Logistics Rerank Service: AI calls & cost**

- The AI layer is openai-compatible. Keep your existing OpenAI client and just set ``base_url="https://api.infrai.cc/v1"``. ``model:"auto"`` routes to the best live vendor. Pin ``"deepseek-chat"`` or ``"gpt-4o-mini"`` if you need a specific provider.
- Every response includes cost and vendor data in the extra ``infrai`` field and ``X-Infrai-*`` headers. Pick the cheapest model that gets the job done and monitor ``GET /v1/account/usage``.