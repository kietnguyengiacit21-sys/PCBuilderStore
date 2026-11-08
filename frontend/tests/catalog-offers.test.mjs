import assert from "node:assert/strict";
import test from "node:test";
import { canPurchaseOffer, customerVisibleOffers } from "../src/catalog-offers.ts";

const storedOffer = {
  offerId: "42",
  condition: "NEW",
  price: "0.00",
  currency: "VND",
  stockQuantity: 3,
  availableQuantity: 2,
  warrantyMonths: 12,
  status: "ACTIVE",
};

test("offer visibility depends on stored active price, currency and available stock fields", () => {
  assert.deepEqual(customerVisibleOffers([storedOffer]), [storedOffer]);
  assert.equal(canPurchaseOffer(storedOffer), true);
  assert.equal(canPurchaseOffer(storedOffer, 3), false);
  assert.equal(canPurchaseOffer({ ...storedOffer, availableQuantity: 0 }), false);
});

test("does not make inactive or malformed offers purchasable", () => {
  assert.deepEqual(customerVisibleOffers([
    { ...storedOffer, status: "INACTIVE" },
    { ...storedOffer, currency: "VNDX" },
    { ...storedOffer, price: "-1" },
    { ...storedOffer, availableQuantity: -1 },
  ]), []);
  assert.equal(canPurchaseOffer({ ...storedOffer, offerId: "DEMO-42" }), false);
  assert.equal(canPurchaseOffer({ ...storedOffer, offerId: undefined }), false);
});
