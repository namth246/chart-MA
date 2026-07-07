import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractGvizJson,
  normalizePercent,
  parseDateVN,
  parseGvizRows,
  parseGvizResponse,
  classifyMarketRegime,
} from "../src/sheetParser.js";

describe("normalizePercent", () => {
  it("converts decimal sheet values to 0-100 scale", () => {
    assert.equal(normalizePercent({ v: 0.3077, f: "30.77%" }), 30.77);
  });

  it("keeps values already on 0-100 scale", () => {
    assert.equal(normalizePercent({ v: 30.77, f: "30.77%" }), 30.77);
  });

  it("parses formatted percent string when v is missing", () => {
    assert.equal(normalizePercent({ f: "25.51%" }), 25.51);
  });

  it("handles negative decimals correctly", () => {
    assert.equal(normalizePercent({ v: -0.1644, f: "-16.44%" }), -16.44);
  });
});

describe("parseDateVN", () => {
  it("parses dd-mm-yyyy", () => {
    const d = parseDateVN("01-06-2026");
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 5);
    assert.equal(d.getDate(), 1);
  });

  it("parses yyyy-mm-dd", () => {
    const d = parseDateVN("2016-01-04");
    assert.equal(d.getFullYear(), 2016);
    assert.equal(d.getMonth(), 0);
    assert.equal(d.getDate(), 4);
  });

  it("parses Date(yyyy,m,d)", () => {
    const d = parseDateVN("Date(2016,0,4)");
    assert.equal(d.getFullYear(), 2016);
    assert.equal(d.getMonth(), 0);
    assert.equal(d.getDate(), 4);
  });

  it("returns null for invalid date", () => {
    assert.equal(parseDateVN("Row Labels"), null);
    assert.equal(parseDateVN(""), null);
  });
});

describe("parseGvizRows", () => {
  const table = {
    rows: [
      { c: [{ v: "Row Labels" }, null, null, null, null, null, null, null, null, null, null, null, null, null] },
      {
        c: [
          { v: "Date(2016,0,4)" },
          { v: 571.04 },
          { v: 569.3 },
          { v: 586.63 },
          { v: 0.5103 },
          { v: 0.5103 },
          { v: 0.3819 },
          { v: 0.3500 },
          { v: 0.2661 },
          { v: 0.4 },
          { v: -0.1644 },
          { v: -0.1000 },
          { v: 0.0559 },
          { v: -0.1434 },
        ],
      },
    ],
  };

  it("skips header and maps all 14 columns correctly", () => {
    const rows = parseGvizRows(table);
    assert.equal(rows.length, 1);
    const r = rows[0];
    assert.equal(r.dateText, "Date(2016,0,4)");
    assert.equal(r.vnIndexMa10, 571.04);
    assert.equal(r.vnIndexMa20, 569.3);
    assert.equal(r.vnIndexMa50, 586.63);
    assert.equal(r.ma10, 51.03);
    assert.equal(r.ma20, 51.03);
    assert.equal(r.ma50, 38.19);
    assert.equal(r.ma200, 35.0);
    assert.equal(r.s50, 26.61);
    assert.equal(r.macdPos, 40.0);
    assert.equal(r.shortBreadthDrawdown10, -16.44);
    assert.equal(r.b50Drawdown20, -10.0);
    assert.equal(r.shortBreadthRebound10, 5.59);
    assert.equal(r.b20Change5, -14.34);
  });
});

describe("classifyMarketRegime", () => {
  it("classifies Tăng đồng thuận correctly", () => {
    const row = {
      vnIndexMa10: 1200,
      vnIndexMa20: 1180,
      vnIndexMa50: 1150,
      ma10: 70,
      ma20: 65,
      ma50: 62,
      ma200: 60,
      s50: 58,
      macdPos: 60,
      shortBreadthDrawdown10: -10,
      b50Drawdown20: -8,
      shortBreadthRebound10: 2,
      b20Change5: 5,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Tăng");
    assert.equal(res.regime, "Tăng đồng thuận");
    assert.equal(res.mode, "Giải ngân chủ động");
    assert.equal(res.risk, "70-100% NAV");
  });

  it("classifies Tăng phân hóa - Giải ngân chọn lọc correctly", () => {
    const row = {
      vnIndexMa10: 1200,
      vnIndexMa20: 1180,
      vnIndexMa50: 1150,
      ma10: 70,
      ma20: 55, // fails B20 >= 60%
      ma50: 62,
      ma200: 60,
      s50: 58,
      macdPos: 60,
      shortBreadthDrawdown10: -10,
      b50Drawdown20: -8,
      shortBreadthRebound10: 2,
      b20Change5: 5,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Tăng");
    assert.equal(res.regime, "Tăng phân hóa");
    assert.equal(res.mode, "Giải ngân chọn lọc");
    assert.equal(res.risk, "40-60% NAV");
  });

  it("classifies Tăng phân hóa - Tạm dừng mua mới correctly due to drawdown", () => {
    const row = {
      vnIndexMa10: 1200,
      vnIndexMa20: 1180,
      vnIndexMa50: 1150,
      ma10: 70,
      ma20: 55,
      ma50: 62,
      ma200: 60,
      s50: 58,
      macdPos: 60,
      shortBreadthDrawdown10: -26, // fails drawdown > -25
      b50Drawdown20: -8,
      shortBreadthRebound10: 2,
      b20Change5: 5,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Tăng");
    assert.equal(res.regime, "Tăng phân hóa");
    assert.equal(res.mode, "Tạm dừng mua mới");
    assert.equal(res.risk, "20-40% NAV");
  });

  it("classifies Nhiễu loạn đi ngang - Quan sát tích cực correctly", () => {
    const row = {
      vnIndexMa10: 1200,
      vnIndexMa20: 1210, // Not sorted -> Core = Nhiễu
      vnIndexMa50: 1150,
      ma10: 50,
      ma20: 45,
      ma50: 40,
      ma200: 30,
      s50: 40,
      macdPos: 35,
      shortBreadthDrawdown10: -5,
      b50Drawdown20: -5,
      shortBreadthRebound10: 22, // Rebound >= 20
      b20Change5: 5,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Nhiễu");
    assert.equal(res.regime, "Nhiễu loạn đi ngang");
    assert.equal(res.mode, "Quan sát tích cực");
    assert.equal(res.risk, "10-30% NAV");
  });

  it("classifies Giảm cân bằng correctly", () => {
    const row = {
      vnIndexMa10: 1100,
      vnIndexMa20: 1150,
      vnIndexMa50: 1200, // Core = Giảm
      ma10: 36, // B10 >= 35%
      ma20: 42,
      ma50: 50, // B50 < 65%
      ma200: 30,
      s50: 20,
      macdPos: 25,
      shortBreadthDrawdown10: -20,
      b50Drawdown20: -20,
      shortBreadthRebound10: 25, // Rebound >= 20
      b20Change5: 9, // Change5 >= 8
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Giảm");
    assert.equal(res.regime, "Giảm cân bằng");
    assert.equal(res.mode, "Quan sát tích cực");
    assert.equal(res.risk, "0-20% NAV");
  });

  it("classifies Giảm đồng thuận correctly", () => {
    const row = {
      vnIndexMa10: 1100,
      vnIndexMa20: 1150,
      vnIndexMa50: 1200, // Core = Giảm
      ma10: 15,
      ma20: 25,
      ma50: 40,
      ma200: 30,
      s50: 20,
      macdPos: 25,
      shortBreadthDrawdown10: -20,
      b50Drawdown20: -20,
      shortBreadthRebound10: 5, // fails rebound >= 20
      b20Change5: 3,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.core, "Giảm");
    assert.equal(res.regime, "Giảm đồng thuận");
    assert.equal(res.mode, "Phòng thủ danh mục");
    assert.equal(res.risk, "0-20% NAV");
    assert.equal(res.isWeak, true); // B10<=20, B20<=30, B50<=45, macdPos<=30
  });

  it("handles empty/warm-up rows by returning null classification", () => {
    const row = {
      vnIndexMa10: 571.04,
      vnIndexMa20: 569.3,
      vnIndexMa50: 586.63,
      ma10: 51.03,
      ma20: 51.03,
      ma50: 38.19,
      ma200: NaN, // Empty warm-up
      s50: NaN,
      macdPos: 40,
      shortBreadthDrawdown10: NaN,
      b50Drawdown20: NaN,
      shortBreadthRebound10: NaN,
      b20Change5: NaN,
    };
    const res = classifyMarketRegime(row);
    assert.equal(res.regime, null);
  });
});
