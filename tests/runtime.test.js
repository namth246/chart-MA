import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFileProtocol } from "../src/runtime.js";

describe("isFileProtocol", () => {
  it("detects file protocol", () => {
    assert.equal(isFileProtocol("file:"), true);
  });

  it("allows http and https", () => {
    assert.equal(isFileProtocol("http:"), false);
    assert.equal(isFileProtocol("https:"), false);
  });
});
