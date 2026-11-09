import assert from "node:assert/strict";
import test from "node:test";
import { verifiedCartSubtotal } from "../src/cart-pricing.ts";

const item = (subtotal, currency = "VND") => ({ unitPrice: subtotal, subtotal, currency });

test("sums server-calculated subtotals for a single verified currency", () => {
  assert.deepEqual(verifiedCartSubtotal([
    item(125000),
    item(250000),
  ]), { amount: 375000, currency: "VND" });
});

test("does not display an estimated subtotal for missing or mixed currency prices", () => {
  assert.equal(verifiedCartSubtotal([]), null);
  assert.equal(verifiedCartSubtotal([item(null)]), null);
  assert.equal(verifiedCartSubtotal([item(100, null)]), null);
  assert.equal(verifiedCartSubtotal([item(100), item(200, "USD")]), null);
  assert.equal(verifiedCartSubtotal([item(-1)]), null);
});
