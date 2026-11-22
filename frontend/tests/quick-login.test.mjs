import assert from "node:assert/strict";
import test from "node:test";
import { isObviousPin, normalizeUsername, pinProblem, usernameProblem } from "../src/v2/quick-login.ts";

test("usernames are normalised like the server does", () => {
  assert.equal(normalizeUsername("  @Khoa.Tran "), "khoa.tran");
});

test("valid usernames pass and malformed ones explain why", () => {
  for (const name of ["khoa.tran", "gamer_2026", "abc", "@Khoa"]) {
    assert.equal(usernameProblem(name), null, name);
  }
  for (const name of ["", "ab", "a".repeat(31), ".khoa", "khoa.", "kh oa", "trần", "12345678", "khoa..tran", "khoa._x"]) {
    assert.notEqual(usernameProblem(name), null, name);
  }
});

test("obvious PINs are refused, others accepted", () => {
  for (const pin of ["12345678", "87654321", "01234567", "11111111", "12121212", "12341234"]) {
    assert.equal(isObviousPin(pin), true, pin);
    assert.notEqual(pinProblem(pin), null, pin);
  }
  for (const pin of ["40718263", "19982704"]) {
    assert.equal(isObviousPin(pin), false, pin);
    assert.equal(pinProblem(pin), null, pin);
  }
  assert.notEqual(pinProblem("1234567"), null);
  assert.notEqual(pinProblem("4071826a"), null);
});
