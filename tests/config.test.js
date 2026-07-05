import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SHEET_ID,
  buildGvizUrl,
  getDefaultSheetUrl,
  parseSheetUrl,
} from "../src/config.js";

describe("getDefaultSheetUrl", () => {
  it("returns the configured spreadsheet URL", () => {
    assert.equal(
      getDefaultSheetUrl(),
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
    );
  });
});

describe("parseSheetUrl", () => {
  it("extracts sheet id from full Google Sheets URL", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=0";
    assert.equal(parseSheetUrl(url), "abc123XYZ");
  });

  it("extracts sheet id from sharing URL with query params", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/abc123XYZ/edit?usp=sharing";
    assert.equal(parseSheetUrl(url), "abc123XYZ");
  });

  it("accepts bare spreadsheet id", () => {
    assert.equal(parseSheetUrl(SHEET_ID), SHEET_ID);
  });

  it("throws on empty input", () => {
    assert.throws(() => parseSheetUrl(""), /không được để trống/i);
    assert.throws(() => parseSheetUrl("   "), /không được để trống/i);
  });

  it("throws on invalid link", () => {
    assert.throws(() => parseSheetUrl("not-a-sheet-link"), /không hợp lệ/i);
  });
});

describe("buildGvizUrl", () => {
  it("uses default sheet id when none is provided", () => {
    const url = buildGvizUrl();
    assert.match(url, new RegExp(`/spreadsheets/d/${SHEET_ID}/gviz/tq`));
  });

  it("uses custom sheet id when provided", () => {
    const customId = "customSheetId1234567890";
    const url = buildGvizUrl(customId);
    assert.match(url, new RegExp(`/spreadsheets/d/${customId}/gviz/tq`));
    assert.doesNotMatch(url, new RegExp(`/spreadsheets/d/${SHEET_ID}/gviz/tq`));
  });
});
