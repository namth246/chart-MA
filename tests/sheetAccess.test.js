import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPinFormat,
  verifySheetPin,
} from "../src/sheetAccess.js";
import { SHEET_ACCESS_PIN } from "../src/config.js";

describe("isValidPinFormat", () => {
  it("accepts exactly 4 digits", () => {
    assert.equal(isValidPinFormat("1234"), true);
    assert.equal(isValidPinFormat(" 5678 "), true);
  });

  it("rejects non-4-digit values", () => {
    assert.equal(isValidPinFormat(""), false);
    assert.equal(isValidPinFormat("123"), false);
    assert.equal(isValidPinFormat("12345"), false);
    assert.equal(isValidPinFormat("12a4"), false);
  });
});

describe("verifySheetPin", () => {
  it("passes for configured pin", () => {
    assert.equal(verifySheetPin(SHEET_ACCESS_PIN), true);
  });

  it("throws for wrong pin", () => {
    assert.throws(() => verifySheetPin("0000"), /không đúng/i);
  });

  it("throws for invalid format", () => {
    assert.throws(() => verifySheetPin("12"), /4 chữ số/i);
  });
});
