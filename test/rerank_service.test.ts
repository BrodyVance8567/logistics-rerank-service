import assert from "node:assert/strict";
import { buildCandidates, Shipment } from "../src/rerank_service.js";

const shipment = Shipment.parse({ id: "SHP-42", query: "delivery exception", events: ["picked up", "delayed at hub"], proofOfDelivery: ["signed by J. Lee"], exception: "weather delay" });
const candidates = buildCandidates(shipment);
assert.equal(candidates.length, 2);
assert.match(candidates[0].text, /weather delay/);
assert.equal(candidates[1].id, "SHP-42-pod-1");
console.log("shipment candidate decision passed");
