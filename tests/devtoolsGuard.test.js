import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDevtoolsShortcut,
  shouldBlockDevtools,
} from "../src/devtoolsGuard.js";

describe("shouldBlockDevtools", () => {
  it("blocks when devtools are not allowed", () => {
    assert.equal(shouldBlockDevtools(false), true);
  });

  it("allows when devtools are allowed", () => {
    assert.equal(shouldBlockDevtools(true), false);
  });
});

describe("isDevtoolsShortcut", () => {
  it("blocks F12", () => {
    assert.equal(isDevtoolsShortcut({ key: "F12" }), true);
  });

  it("blocks ctrl+shift+i", () => {
    assert.equal(
      isDevtoolsShortcut({ key: "I", ctrlKey: true, shiftKey: true }),
      true
    );
  });

  it("blocks ctrl+shift+j", () => {
    assert.equal(
      isDevtoolsShortcut({ key: "J", ctrlKey: true, shiftKey: true }),
      true
    );
  });

  it("allows normal typing", () => {
    assert.equal(isDevtoolsShortcut({ key: "a", ctrlKey: false }), false);
  });
});
