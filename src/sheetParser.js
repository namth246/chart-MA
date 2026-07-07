/** @typedef {{ v?: number | string, f?: string }} GvizCell */
/** @typedef {{ c?: (GvizCell | null)[] }} GvizRow */
/** @typedef {{ rows?: GvizRow[] }} GvizTable */

/**
 * @param {string} text
 */
export function extractGvizJson(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\)\s*;?\s*$/);
  if (!match) {
    throw new Error("Invalid gviz response: missing setResponse wrapper");
  }
  return JSON.parse(match[1]);
}

/**
 * @param {GvizCell | null | undefined} cell
 */
export function normalizePercent(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return NaN;

  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    const scaled = cell.v <= 1 ? cell.v * 100 : cell.v;
    return Math.round(scaled * 100) / 100;
  }

  const raw = cell.f ?? cell.v ?? "";
  const cleaned = String(raw).replace("%", "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/**
 * @param {string} s
 */
export function parseDateVN(s) {
  if (!s) return null;
  s = String(s).trim();
  
  // Match Date(yyyy,m,d) where m is 0-indexed month
  const gvizMatch = s.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (gvizMatch) {
    return new Date(+gvizMatch[1], +gvizMatch[2], +gvizMatch[3]);
  }
  
  // Match dd-mm-yyyy
  const vnMatch = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (vnMatch) {
    return new Date(+vnMatch[3], +vnMatch[2] - 1, +vnMatch[1]);
  }
  
  // Match yyyy-mm-dd
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  }
  
  // Fallback
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  
  return null;
}

/**
 * @param {number} value
 */
export function formatPctValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2) + "%";
}

/**
 * @param {GvizTable} table
 */
export function parseGvizRows(table) {
  const rows = table.rows ?? [];
  const result = [];

  for (const row of rows) {
    const cells = row.c ?? [];
    const dateCell = cells[0];
    const dateText = dateCell?.f ?? dateCell?.v;
    if (!dateText || String(dateText).trim() === "Row Labels" || String(dateText).trim() === "Date") continue;

    const dateObj = parseDateVN(String(dateText));
    if (!dateObj) continue;

    // VNIndex absolute levels
    const vnIndexMa10 = cells[1] && cells[1].v !== null ? Number(cells[1].v) : NaN;
    const vnIndexMa20 = cells[2] && cells[2].v !== null ? Number(cells[2].v) : NaN;
    const vnIndexMa50 = cells[3] && cells[3].v !== null ? Number(cells[3].v) : NaN;

    // Breadth percentages
    const ma10 = normalizePercent(cells[4]);
    const ma20 = normalizePercent(cells[5]);
    const ma50 = normalizePercent(cells[6]);
    const ma200 = normalizePercent(cells[7]);
    const s50 = normalizePercent(cells[8]);
    const macdPos = normalizePercent(cells[9]);

    // Drawdowns / Rebounds / Changes
    const shortBreadthDrawdown10 = normalizePercent(cells[10]);
    const b50Drawdown20 = normalizePercent(cells[11]);
    const shortBreadthRebound10 = normalizePercent(cells[12]);
    const b20Change5 = normalizePercent(cells[13]);

    result.push({
      dateText: String(dateText).trim(),
      dateObj,
      vnIndexMa10,
      vnIndexMa20,
      vnIndexMa50,
      ma10,
      ma20,
      ma50,
      ma200,
      s50,
      macdPos,
      shortBreadthDrawdown10,
      b50Drawdown20,
      shortBreadthRebound10,
      b20Change5
    });
  }

  return result;
}

/**
 * @param {string} text
 */
export function parseGvizResponse(text) {
  const payload = extractGvizJson(text);
  return parseGvizRows(payload.table ?? {});
}

/**
 * @param {ReturnType<typeof parseGvizRows>} data
 */
export function toDisplayRows(data) {
  return data.map((d) => [
    d.dateText.startsWith("Date(") ? d.dateObj.toLocaleDateString("vi-VN") : d.dateText,
    formatPctValue(d.ma10),
    formatPctValue(d.ma20),
    formatPctValue(d.ma50),
    formatPctValue(d.ma200),
  ]);
}

/**
 * @param {ReturnType<typeof parseGvizRows>} data
 */
export function serializeDataHash(data) {
  return JSON.stringify(
    data.map((d) => [
      d.dateText,
      d.vnIndexMa10,
      d.vnIndexMa20,
      d.vnIndexMa50,
      d.ma10,
      d.ma20,
      d.ma50,
      d.ma200,
      d.s50,
      d.macdPos,
      d.shortBreadthDrawdown10,
      d.b50Drawdown20,
      d.shortBreadthRebound10,
      d.b20Change5,
    ])
  );
}

/**
 * Classifies the CNF Market Regime based on the quantitative criteria.
 * @param {ReturnType<typeof parseGvizRows>[number]} row
 */
export function classifyMarketRegime(row) {
  if (!row || isNaN(row.vnIndexMa10) || isNaN(row.vnIndexMa20) || isNaN(row.vnIndexMa50)) {
    return { core: null, regime: null, mode: null, risk: null };
  }

  // 1. Core MA Stack
  let core = "Nhiễu";
  if (row.vnIndexMa10 > row.vnIndexMa20 && row.vnIndexMa20 > row.vnIndexMa50) {
    core = "Tăng";
  } else if (row.vnIndexMa10 < row.vnIndexMa20 && row.vnIndexMa20 < row.vnIndexMa50) {
    core = "Giảm";
  }

  // 2. Classify by Core Stack
  if (core === "Tăng") {
    // Conditions for Tăng đồng thuận
    const cond1 = row.ma20 >= 60;
    const cond2 = row.ma50 >= 60;
    const cond3 = row.s50 >= 55;
    const cond4 = row.macdPos >= 55;
    const cond5 = row.shortBreadthDrawdown10 > -25;
    const cond6 = row.b50Drawdown20 > -15;

    // Check if any of these critical values are NaN
    if ([row.ma20, row.ma50, row.s50, row.macdPos, row.shortBreadthDrawdown10, row.b50Drawdown20].some(isNaN)) {
      return { core, regime: null, mode: null, risk: null };
    }

    if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6) {
      return {
        core,
        regime: "Tăng đồng thuận",
        mode: "Giải ngân chủ động",
        risk: "70-100% NAV",
        details: { cond1, cond2, cond3, cond4, cond5, cond6 }
      };
    } else {
      // Tăng phân hóa
      const warn1 = row.shortBreadthDrawdown10 <= -25;
      const warn2 = row.b50Drawdown20 <= -15;
      const warn3 = row.s50 < 45 && row.macdPos < 45;

      if (warn1 || warn2 || warn3) {
        return {
          core,
          regime: "Tăng phân hóa",
          mode: "Tạm dừng mua mới",
          risk: "20-40% NAV",
          details: { cond1, cond2, cond3, cond4, cond5, cond6, warnings: { warn1, warn2, warn3 } }
        };
      } else {
        return {
          core,
          regime: "Tăng phân hóa",
          mode: "Giải ngân chọn lọc",
          risk: "40-60% NAV",
          details: { cond1, cond2, cond3, cond4, cond5, cond6, warnings: { warn1, warn2, warn3 } }
        };
      }
    }
  } else if (core === "Nhiễu") {
    // Warnings for Sideways
    const warn1 = row.shortBreadthDrawdown10 <= -20;
    const warn2 = row.b50Drawdown20 <= -12;
    const warn3 = row.ma20 <= 30 && row.ma50 <= 45;

    if ([row.ma20, row.ma50, row.shortBreadthDrawdown10, row.b50Drawdown20].some(isNaN)) {
      return { core, regime: null, mode: null, risk: null };
    }

    if (warn1 || warn2 || warn3) {
      return {
        core,
        regime: "Nhiễu loạn đi ngang",
        mode: "Tạm dừng mua mới",
        risk: "0-20% NAV",
        details: { warnings: { warn1, warn2, warn3 } }
      };
    }

    // Support rebound for Sideways
    const support1 = row.shortBreadthRebound10 >= 20;
    const support2 = row.ma20 >= 40;

    if ([row.shortBreadthRebound10, row.ma20].some(isNaN)) {
      return { core, regime: null, mode: null, risk: null };
    }

    if (support1 && support2) {
      return {
        core,
        regime: "Nhiễu loạn đi ngang",
        mode: "Quan sát tích cực",
        risk: "10-30% NAV",
        details: { support: { support1, support2 } }
      };
    }

    return {
      core,
      regime: "Nhiễu loạn đi ngang",
      mode: "Tạm dừng mua mới / Quan sát",
      risk: "0-20% NAV",
      details: {}
    };
  } else if (core === "Giảm") {
    // Check Giảm cân bằng
    const cond1 = row.shortBreadthRebound10 >= 20;
    const cond2 = row.ma10 >= 35;
    const cond3 = row.b20Change5 >= 8;
    const cond4 = row.ma50 < 65;

    if ([row.shortBreadthRebound10, row.ma10, row.b20Change5, row.ma50].some(isNaN)) {
      return { core, regime: null, mode: null, risk: null };
    }

    if (cond1 && cond2 && cond3 && cond4) {
      const highConfidence = row.ma20 >= 40;
      return {
        core,
        regime: "Giảm cân bằng",
        mode: "Quan sát tích cực",
        risk: "0-20% NAV",
        details: { cond1, cond2, cond3, cond4, highConfidence }
      };
    } else {
      // Giảm đồng thuận
      const isWeak = row.ma10 <= 20 && row.ma20 <= 30 && row.ma50 <= 45 && row.macdPos <= 30;
      return {
        core,
        regime: "Giảm đồng thuận",
        mode: "Phòng thủ danh mục",
        risk: "0-20% NAV",
        isWeak,
        details: { isWeak, cond1, cond2, cond3, cond4 }
      };
    }
  }

  return { core: null, regime: null, mode: null, risk: null };
}
