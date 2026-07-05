import { SHEET_NAME, buildGvizUrl } from "./config.js";
import { parseGvizResponse } from "./sheetParser.js";

/**
 * @param {string} [sheetId]
 */
export async function fetchSheetData(sheetId) {
  const response = await fetch(buildGvizUrl(sheetId));
  if (!response.ok) {
    throw new Error(`Google Sheet trả về HTTP ${response.status}`);
  }
  const text = await response.text();
  const rows = parseGvizResponse(text);
  if (!rows.length) {
    throw new Error(`Không có dòng dữ liệu hợp lệ từ sheet ${SHEET_NAME}`);
  }
  return rows;
}
