import assert from "node:assert/strict";
import test from "node:test";
import {
  availableProductImages,
  preferredProductImage,
  uniqueProductImages,
} from "../src/v2/product-images.ts";

const images = [
  { url: "broken-primary.jpg", altText: null, isPrimary: true },
  { url: "working-secondary.jpg", altText: null, isPrimary: false },
  { url: "working-secondary.jpg", altText: "Secondary image", isPrimary: true },
];

test("deduplicates image URLs while preserving the primary image metadata", () => {
  const unique = uniqueProductImages(images);
  assert.equal(unique.length, 2);
  assert.deepEqual(unique[1], images[2]);
  assert.equal(preferredProductImage(unique)?.url, "broken-primary.jpg");
});

test("uses remaining real images after failures and exposes no gallery images when all fail", () => {
  const unique = uniqueProductImages(images);
  assert.deepEqual(availableProductImages(unique, new Set(["broken-primary.jpg"])), [images[2]]);
  assert.deepEqual(availableProductImages(unique, new Set(unique.map((image) => image.url))), []);
  assert.equal(preferredProductImage([]), undefined);
});
