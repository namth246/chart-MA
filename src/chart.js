import { SERIES_COLORS } from "./config.js";
import { formatPctValue, classifyMarketRegime } from "./sheetParser.js";

/**
 * @param {import("./sheetParser.js").parseGvizRows extends (...args: any) => infer R ? R : never} data
 */
export function buildTraces(data) {
  const x = data.map((d) => d.dateText.startsWith("Date(") ? d.dateObj.toLocaleDateString("vi-VN") : d.dateText);
  const series = [
    { name: "C>MA10", key: "ma10" },
    { name: "C>MA20", key: "ma20" },
    { name: "C>MA50", key: "ma50" },
    { name: "C>MA200", key: "ma200" },
  ];

  return series.map((s) => ({
    x,
    y: data.map((d) => d[s.key]),
    type: "scatter",
    mode: "lines+markers",
    name: s.name,
    line: { color: SERIES_COLORS[s.name], width: 3, shape: "spline" },
    marker: { size: 7, color: SERIES_COLORS[s.name] },
    hovertemplate: `<b>%{x}</b><br>• ${s.name}: %{y:.2f}%<extra></extra>`,
  }));
}

/**
 * @param {import("./sheetParser.js").parseGvizRows extends (...args: any) => infer R ? R : never} data
 */
export function buildLayout(data) {
  const len = data.length;
  const xValues = data.map((d) => d.dateText.startsWith("Date(") ? d.dateObj.toLocaleDateString("vi-VN") : d.dateText);
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#FFFFFF", family: '"Times New Roman", Times, serif', size: 14 },
    xaxis: {
      title: "Ngày",
      gridcolor: "rgba(255,255,255,.12)",
      tickangle: -35,
      tickvals: xValues,
      rangeslider: { visible: true, bgcolor: "#071229", thickness: 0.08 },
    },
    yaxis: {
      title: "Tỷ lệ (%)",
      gridcolor: "rgba(255,255,255,.12)",
      ticksuffix: "%",
    },
    hovermode: "x unified",
    updatemenus: [
      {
        type: "buttons",
        direction: "right",
        x: 0,
        y: -0.22,
        buttons: [
          { label: "1M", method: "relayout", args: [{ "xaxis.range": [Math.max(0, len - 22), len - 1] }] },
          { label: "3M", method: "relayout", args: [{ "xaxis.range": [Math.max(0, len - 66), len - 1] }] },
          { label: "6M", method: "relayout", args: [{ "xaxis.range": [Math.max(0, len - 132), len - 1] }] },
          { label: "YTD", method: "relayout", args: [{ "xaxis.range": [0, len - 1] }] },
          { label: "MAX", method: "relayout", args: [{ "xaxis.autorange": true }] },
        ],
        bgcolor: "#071229",
        bordercolor: "rgba(255,255,255,.25)",
        font: { color: "#FFFFFF" },
      },
    ],
    legend: {
      x: 0.01,
      y: 0.98,
      bgcolor: "rgba(0,0,0,.55)",
      bordercolor: "rgba(255,255,255,.18)",
      borderwidth: 1,
      font: { size: 16 },
    },
    margin: { l: 70, r: 30, t: 35, b: 120 },
    dragmode: "pan",
  };
}

export const chartConfig = {
  responsive: true,
  scrollZoom: true,
  displaylogo: false,
  modeBarButtonsToAdd: ["drawline"],
  toImageButtonOptions: {
    format: "png",
    filename: "CNF_Live_Sheet_Chart",
    width: 1800,
    height: 1000,
    scale: 2,
  },
};

/**
 * @param {import("./sheetParser.js").parseGvizRows extends (...args: any) => infer R ? R : never} data
 */
export function renderChart(data) {
  const traces = buildTraces(data);
  const layout = buildLayout(data);
  window.Plotly.react("chart", traces, layout, chartConfig);
}

export function updateAudit(data) {
  const body = document.getElementById("auditBody");
  if (!body || !data.length) return;
  body.innerHTML = "";
  const idxs = [0, Math.floor(data.length / 2), data.length - 1];
  const labels = ["Điểm đầu", "Điểm giữa", "Điểm cuối"];
  idxs.forEach((idx, k) => {
    const d = data[idx];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${labels[k]}</td><td>${d.dateText.startsWith("Date(") ? d.dateObj.toLocaleDateString("vi-VN") : d.dateText}</td><td>${formatPctValue(d.ma10)}</td><td>${formatPctValue(d.ma20)}</td><td>${formatPctValue(d.ma50)}</td><td>${formatPctValue(d.ma200)}</td><td class="ok">✓ Pass</td>`;
    body.appendChild(tr);
  });
}

/**
 * Renders the detailed Market Regime evaluation card on the UI.
 * @param {ReturnType<import("./sheetParser.js").parseGvizRows>[number]} row
 */
export function renderMarketRegime(row) {
  if (!row) return;

  const regimeDate = document.getElementById("regimeDate");
  if (regimeDate) {
    const displayDate = row.dateText.startsWith("Date(") ? row.dateObj.toLocaleDateString("vi-VN") : row.dateText;
    regimeDate.textContent = `(Phiên giao dịch ngày: ${displayDate})`;
  }

  const evalResult = classifyMarketRegime(row);

  // Define Badge styling classes
  let badgeClass = "neutral-gray";
  if (evalResult.regime === "Tăng đồng thuận") badgeClass = "bullish-consensus";
  else if (evalResult.regime === "Tăng phân hóa") badgeClass = "bullish-divergent";
  else if (evalResult.regime === "Nhiễu loạn đi ngang") badgeClass = "sideways-noise";
  else if (evalResult.regime === "Giảm cân bằng") badgeClass = "bearish-balanced";
  else if (evalResult.regime === "Giảm đồng thuận") badgeClass = "bearish-consensus";

  const regimeStatus = document.getElementById("regimeStatus");
  if (regimeStatus) {
    regimeStatus.textContent = evalResult.regime || "Không đủ dữ liệu";
    regimeStatus.className = "badge-regime " + badgeClass;
  }

  const regimeMode = document.getElementById("regimeMode");
  if (regimeMode) {
    regimeMode.textContent = evalResult.mode || "Chưa phân loại";
    regimeMode.className = "badge-regime " + badgeClass;
  }

  const regimeRisk = document.getElementById("regimeRisk");
  if (regimeRisk) {
    let riskText = evalResult.risk || "0% NAV";
    if (evalResult.regime === "Giảm đồng thuận" && evalResult.isWeak) {
      riskText = "0-10% NAV (Rất yếu)";
    }
    regimeRisk.textContent = riskText;
    regimeRisk.className = "badge-regime " + badgeClass;
  }

  // Populate Checklist Table
  const checklistBody = document.querySelector("#checklistTable tbody");
  if (checklistBody) {
    checklistBody.innerHTML = "";

    // 1. Core MA Stack
    const coreStatus = evalResult.core ? `Pass (${evalResult.core})` : "NaN";
    const coreClass = evalResult.core ? "status-pass" : "status-nan";
    let coreRow = `
      <tr>
        <td><b>Xu hướng lõi VNIndex (Core)</b></td>
        <td>Xếp hạng MA10, MA20, MA50</td>
        <td>MA10=${row.vnIndexMa10.toFixed(1)} | MA20=${row.vnIndexMa20.toFixed(1)} | MA50=${row.vnIndexMa50.toFixed(1)}</td>
        <td class="${coreClass}">${coreStatus}</td>
      </tr>
    `;
    checklistBody.innerHTML += coreRow;

    // 2. B10, B20, B50, B200
    const b10Status = isNaN(row.ma10) ? "NaN" : (evalResult.core === "Giảm" ? (row.ma10 >= 35 ? "Pass (>=35%)" : "Fail (<35%)") : "Bình thường");
    const b10Class = isNaN(row.ma10) ? "status-nan" : (evalResult.core === "Giảm" ? (row.ma10 >= 35 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>% Cổ phiếu > MA10 (B10)</b></td>
        <td>Giảm cân bằng cần B10 >= 35%</td>
        <td>${formatPctValue(row.ma10)}</td>
        <td class="${b10Class}">${b10Status}</td>
      </tr>
    `;

    const b20Status = isNaN(row.ma20) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.ma20 >= 60 ? "Pass (>=60%)" : "Fail (<60%)") : "Bình thường");
    const b20Class = isNaN(row.ma20) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.ma20 >= 60 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>% Cổ phiếu > MA20 (B20)</b></td>
        <td>Tăng đồng thuận cần B20 >= 60%</td>
        <td>${formatPctValue(row.ma20)}</td>
        <td class="${b20Class}">${b20Status}</td>
      </tr>
    `;

    const b50Status = isNaN(row.ma50) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.ma50 >= 60 ? "Pass (>=60%)" : "Fail (<60%)") : (evalResult.regime === "Giảm cân bằng" ? (row.ma50 < 65 ? "Pass (<65%)" : "Fail (>=65%)") : "Bình thường"));
    const b50Class = isNaN(row.ma50) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.ma50 >= 60 ? "status-pass" : "status-fail") : (evalResult.regime === "Giảm cân bằng" ? (row.ma50 < 65 ? "status-pass" : "status-fail") : ""));
    checklistBody.innerHTML += `
      <tr>
        <td><b>% Cổ phiếu > MA50 (B50)</b></td>
        <td>Tăng đồng thuận >= 60% | Giảm cân bằng < 65%</td>
        <td>${formatPctValue(row.ma50)}</td>
        <td class="${b50Class}">${b50Status}</td>
      </tr>
    `;

    checklistBody.innerHTML += `
      <tr>
        <td><b>% Cổ phiếu > MA200 (B200)</b></td>
        <td>Dài hạn tích cực nếu >= 50%</td>
        <td>${formatPctValue(row.ma200)}</td>
        <td class="${isNaN(row.ma200) ? "status-nan" : ""}">${isNaN(row.ma200) ? "NaN" : "Bình thường"}</td>
      </tr>
    `;

    // 3. S50
    const s50Status = isNaN(row.s50) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.s50 >= 55 ? "Pass (>=55%)" : "Fail (<55%)") : "Bình thường");
    const s50Class = isNaN(row.s50) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.s50 >= 55 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>Độ dốc MA50 (S50)</b></td>
        <td>Tăng đồng thuận cần S50 >= 55%</td>
        <td>${formatPctValue(row.s50)}</td>
        <td class="${s50Class}">${s50Status}</td>
      </tr>
    `;

    // 4. MACD_Pos
    const macdStatus = isNaN(row.macdPos) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.macdPos >= 55 ? "Pass (>=55%)" : "Fail (<55%)") : "Bình thường");
    const macdClass = isNaN(row.macdPos) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.macdPos >= 55 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>Động lượng MACD > 0 (MACD_Pos)</b></td>
        <td>Tăng đồng thuận cần MACD_Pos >= 55%</td>
        <td>${formatPctValue(row.macdPos)}</td>
        <td class="${macdClass}">${macdStatus}</td>
      </tr>
    `;

    // 5. Drawdown/Rebound/Change
    const sbDdStatus = isNaN(row.shortBreadthDrawdown10) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.shortBreadthDrawdown10 > -25 ? "Pass (>-25%)" : "Fail (<=-25%)") : "Bình thường");
    const sbDdClass = isNaN(row.shortBreadthDrawdown10) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.shortBreadthDrawdown10 > -25 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>ShortBreadth_Drawdown10</b></td>
        <td>Tăng đồng thuận cần > -25 điểm %</td>
        <td>${isNaN(row.shortBreadthDrawdown10) ? "-" : row.shortBreadthDrawdown10.toFixed(2) + " pt"}</td>
        <td class="${sbDdClass}">${sbDdStatus}</td>
      </tr>
    `;

    const b50DdStatus = isNaN(row.b50Drawdown20) ? "NaN" : (evalResult.regime === "Tăng đồng thuận" ? (row.b50Drawdown20 > -15 ? "Pass (>-15%)" : "Fail (<=-15%)") : "Bình thường");
    const b50DdClass = isNaN(row.b50Drawdown20) ? "status-nan" : (evalResult.regime === "Tăng đồng thuận" ? (row.b50Drawdown20 > -15 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>B50_Drawdown20</b></td>
        <td>Tăng đồng thuận cần > -15 điểm %</td>
        <td>${isNaN(row.b50Drawdown20) ? "-" : row.b50Drawdown20.toFixed(2) + " pt"}</td>
        <td class="${b50DdClass}">${b50DdStatus}</td>
      </tr>
    `;

    const sbRbStatus = isNaN(row.shortBreadthRebound10) ? "NaN" : (evalResult.core === "Giảm" || evalResult.core === "Nhiễu" ? (row.shortBreadthRebound10 >= 20 ? "Pass (>=20%)" : "Fail (<20%)") : "Bình thường");
    const sbRbClass = isNaN(row.shortBreadthRebound10) ? "status-nan" : (evalResult.core === "Giảm" || evalResult.core === "Nhiễu" ? (row.shortBreadthRebound10 >= 20 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>ShortBreadth_Rebound10</b></td>
        <td>Hồi phục đáy ngắn hạn cần >= 20 điểm %</td>
        <td>${isNaN(row.shortBreadthRebound10) ? "-" : row.shortBreadthRebound10.toFixed(2) + " pt"}</td>
        <td class="${sbRbClass}">${sbRbStatus}</td>
      </tr>
    `;

    const b20ChgStatus = isNaN(row.b20Change5) ? "NaN" : (evalResult.regime === "Giảm cân bằng" ? (row.b20Change5 >= 8 ? "Pass (>=8%)" : "Fail (<8%)") : "Bình thường");
    const b20ChgClass = isNaN(row.b20Change5) ? "status-nan" : (evalResult.regime === "Giảm cân bằng" ? (row.b20Change5 >= 8 ? "status-pass" : "status-fail") : "");
    checklistBody.innerHTML += `
      <tr>
        <td><b>B20_Change5</b></td>
        <td>Giảm cân bằng cần B20_Change5 >= 8 điểm %</td>
        <td>${isNaN(row.b20Change5) ? "-" : row.b20Change5.toFixed(2) + " pt"}</td>
        <td class="${b20ChgClass}">${b20ChgStatus}</td>
      </tr>
    `;
  }

  // Update Handoff table instructions
  const b2Allowed = document.getElementById("b2Allowed");
  const b2Denied = document.getElementById("b2Denied");
  const b3Allowed = document.getElementById("b3Allowed");
  const b3Denied = document.getElementById("b3Denied");
  const b4Allowed = document.getElementById("b4Allowed");
  const b4Denied = document.getElementById("b4Denied");

  if (evalResult.regime === "Tăng đồng thuận") {
    if (b2Allowed) b2Allowed.textContent = "Được mở vị thế mới nếu đạt chuẩn; tìm kiếm cơ hội rộng hơn trong vũ trụ CP.";
    if (b2Denied) b2Denied.textContent = "Không mua cổ phiếu yếu chỉ vì thị trường chung tốt.";
    if (b3Allowed) b3Allowed.textContent = "Gia tăng vị thế khỏe, mở vị thế thăm dò/chủ động rộng rãi.";
    if (b3Denied) b3Denied.textContent = "Không bắt buộc dùng hết trần rủi ro nếu thiếu setup.";
    if (b4Allowed) b4Allowed.textContent = "Nâng trần rủi ro tham chiếu lên 70-100% NAV.";
    if (b4Denied) b4Denied.textContent = "Không bỏ qua điểm dừng lỗ cá nhân.";
  } else if (evalResult.regime === "Tăng phân hóa") {
    if (evalResult.mode === "Giải ngân chọn lọc") {
      if (b2Allowed) b2Allowed.textContent = "Mở vị thế tốt nhất, lọc kỹ số lượng mã.";
      if (b2Denied) b2Denied.textContent = "Không mua lan rộng, không mua đuổi.";
      if (b3Allowed) b3Allowed.textContent = "Chỉ gia tăng các vị thế khỏe đang chứng minh sức mạnh.";
      if (b3Denied) b3Denied.textContent = "Không giải ngân ồ ạt.";
      if (b4Allowed) b4Allowed.textContent = "Giữ trần rủi ro 40-60% NAV.";
      if (b4Denied) b4Denied.textContent = "Không nâng trần rủi ro vô điều kiện.";
    } else {
      // Tạm dừng mua mới
      if (b2Allowed) b2Allowed.textContent = "Theo dõi và quản sát.";
      if (b2Denied) b2Denied.textContent = "Tuyệt đối không mở vị thế mới.";
      if (b3Allowed) b3Allowed.textContent = "Giữ vị thế khỏe chưa mất cấu trúc hỗ trợ.";
      if (b3Denied) b3Denied.textContent = "Không gia tăng vị thế.";
      if (b4Allowed) b4Allowed.textContent = "Hạ trần rủi ro xuống 20-40% NAV.";
      if (b4Denied) b4Denied.textContent = "Không giữ các vị thế vi phạm kỷ luật.";
    }
  } else if (evalResult.regime === "Nhiễu loạn đi ngang") {
    if (evalResult.mode === "Quan sát tích cực") {
      if (b2Allowed) b2Allowed.textContent = "Lập watchlist tích cực hơn, tìm CP giữ giá tốt.";
      if (b2Denied) b2Denied.textContent = "Không mua theo tín hiệu đơn lẻ của cổ phiếu.";
      if (b3Allowed) b3Allowed.textContent = "Thăm dò nhỏ (tối đa 10% NAV) khi có kế hoạch rất rõ.";
      if (b3Denied) b3Denied.textContent = "Không mua đuổi, không gia tăng.";
      if (b4Allowed) b4Allowed.textContent = "Trần rủi ro tối đa 10-30% NAV.";
      if (b4Denied) b4Denied.textContent = "Không bình quân giá xuống.";
    } else {
      // Tạm dừng mua mới
      if (b2Allowed) b2Allowed.textContent = "Theo dõi và quan sát.";
      if (b2Denied) b2Denied.textContent = "Không mở vị thế mới theo mặc định.";
      if (b3Allowed) b3Allowed.textContent = "Nắm giữ tiền mặt chủ yếu.";
      if (b3Denied) b3Denied.textContent = "Không gia tăng vị thế.";
      if (b4Allowed) b4Allowed.textContent = "Áp dụng trần rủi ro nghiêm ngặt 0-20% NAV.";
      if (b4Denied) b4Denied.textContent = "Không mua thăm dò.";
    }
  } else if (evalResult.regime === "Giảm cân bằng") {
    if (b2Allowed) b2Allowed.textContent = "Lập watchlist chuẩn bị kế hoạch, tìm CP giữ cấu trúc.";
    if (b2Denied) b2Denied.textContent = "Không mua lan rộng, không bắt đáy vội.";
    if (b3Allowed) b3Allowed.textContent = "Ngoại lệ thăm dò tối đa 10% NAV chỉ khi có setup và điểm cắt lỗ rõ.";
    if (b3Denied) b3Denied.textContent = "Không giải ngân rộng, không mua gia tăng.";
    if (b4Allowed) b4Allowed.textContent = "Trần rủi ro duy trì 0-20% NAV.";
    if (b4Denied) b4Denied.textContent = "Không tự ý nâng trần rủi ro.";
  } else if (evalResult.regime === "Giảm đồng thuận") {
    if (b2Allowed) b2Allowed.textContent = "Theo dõi các cổ phiếu chống chọi tốt hơn thị trường.";
    if (b2Denied) b2Denied.textContent = "Không mở vị thế mới, không bắt đáy.";
    if (b3Allowed) b3Allowed.textContent = "Giảm vị thế yếu hoặc vi phạm điểm dừng, ưu tiên tiền mặt.";
    if (b3Denied) b3Denied.textContent = "Không gia tăng vị thế.";
    if (b4Allowed) b4Allowed.textContent = evalResult.isWeak ? "Trần rủi ro ưu tiên 0-10% NAV (Giảm đồng thuận rất yếu)." : "Trần rủi ro 0-20% NAV.";
    if (b4Denied) b4Denied.textContent = "Tuyệt đối không trung bình giá xuống.";
  } else {
    // Không đủ dữ liệu
    if (b2Allowed) b2Allowed.textContent = "Chờ dữ liệu tích lũy.";
    if (b2Denied) b2Denied.textContent = "Không thực hiện hành động dựa trên dự báo.";
    if (b3Allowed) b3Allowed.textContent = "Quan sát thêm.";
    if (b3Denied) b3Denied.textContent = "-";
    if (b4Allowed) b4Allowed.textContent = "Trần rủi ro 0-10% NAV để an toàn.";
    if (b4Denied) b4Denied.textContent = "-";
  }
}

/**
 * @param {import("./sheetParser.js").parseGvizRows extends (...args: any) => infer R ? R : never} data
 */
export function updateSnapshotAndInsight(data) {
  if (!data.length) return;
  const last = data[data.length - 1];
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatPctValue(value);
  };
  set("m10", last.ma10);
  set("m20", last.ma20);
  set("m50", last.ma50);
  set("m200", last.ma200);

  // Render Regime for the latest date by default
  renderMarketRegime(last);

  const minMA10 = data.reduce((a, b) => (b.ma10 < a.ma10 ? b : a), data[0]);
  const insightBox = document.getElementById("insightBox");
  if (!insightBox) return;

  const evalResult = classifyMarketRegime(last);
  let regimeText = "";
  if (evalResult.regime) {
    regimeText = `Hiện tại thị trường đang được phân loại tự động ở trạng thái <b>${evalResult.regime}</b> với chế độ đầu tư <b>${evalResult.mode}</b>. Trần rủi ro tham chiếu khuyến nghị là <b>${evalResult.risk}</b>.`;
    if (evalResult.regime === "Giảm đồng thuận" && evalResult.isWeak) {
      regimeText += ` Đặc biệt, hệ thống nhận diện đây là một pha <b>Giảm đồng thuận rất yếu</b>, khuyến nghị đặc biệt ưu tiên quản trị rủi ro ở mức cực thấp 0-10% NAV.`;
    }
  } else {
    regimeText = "Trạng thái thị trường hiện tại chưa đủ dữ liệu lịch sử để thực hiện phân loại Market Regime một cách chính xác (đang trong giai đoạn tích lũy warm-up).";
  }

  insightBox.innerHTML = `
    <p><b>1. Breadth ngắn hạn:</b> C&gt;MA10 đạt <b>${formatPctValue(last.ma10)}</b> và C&gt;MA20 đạt <b>${formatPctValue(last.ma20)}</b>. So với vùng yếu nhất tại ${minMA10.dateText.startsWith("Date(") ? minMA10.dateObj.toLocaleDateString("vi-VN") : minMA10.dateText}, độ rộng ngắn hạn đang diễn biến như biểu đồ hiển thị.</p>
    <p><b>2. Breadth trung hạn & dài hạn:</b> C&gt;MA50 đạt <b>${formatPctValue(last.ma50)}</b> và C&gt;MA200 đạt <b>${formatPctValue(last.ma200)}</b>. Đây là những đường chỉ số lõi để củng cố sức mạnh của các đợt bùng nổ.</p>
    <p><b>3. Nhận định Market Regime:</b> ${regimeText}</p>
    <p><b>Kết luận CNF:</b> Mức độ giải ngân tối đa cần tuân thủ nghiêm ngặt theo trần rủi ro tương ứng của Regime hiện tại, đi kèm quản lý chi tiết các điều kiện mua bán ở Bước 2 và Bước 3.</p>
  `;
}
