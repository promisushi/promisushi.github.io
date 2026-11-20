/* ============================================================
 * 应用逻辑 — 筛选 / 搜索 / 渲染
 * 费用扩展点：渲染航线卡片时读取 d.internalFee（当前为 null），
 * 后续版本可在卡片底部追加报价区块，无需改动数据结构。
 * ============================================================ */

const state = {
  type: "all",     // all | pax | cgo
  region: "cn",    // cn | jp | sea | am | all
  sub: null,       // 二级分区（cn/jp 下钻时使用）
  query: "",
};

const $list = document.getElementById("routeList");
const $count = document.getElementById("resultCount");
const $empty = document.getElementById("emptyState");

/* ---------- 统计 ---------- */
function updateStats() {
  let total = DESTINATIONS.length, pax = 0, cgo = 0;
  DESTINATIONS.forEach(d => {
    if (d.pax.length) pax++;
    if (d.cgo.length) cgo++;
  });
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPax").textContent = pax;
  document.getElementById("statCgo").textContent = cgo;
}

/* ---------- 过滤 ---------- */
function filterData() {
  const q = state.query.trim().toLowerCase();
  return DESTINATIONS.filter(d => {
    // 类型过滤：卡片必须含有对应类型的航线
    if (state.type === "pax" && !d.pax.length) return false;
    if (state.type === "cgo" && !d.cgo.length) return false;

    // 区域过滤
    if (state.region !== "all" && d.region !== state.region) return false;

    // 搜索：城市 / 中英文 / 机场代码 / 航司名
    if (q) {
      const airlines = [...d.pax, ...d.cgo]
        .map(k => AIRLINES[k])
        .filter(Boolean)
        .map(a => a.name + a.en + a.code)
        .join(" ")
        .toLowerCase();
      const hay = `${d.city} ${d.cityEn} ${d.code} ${airlines}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ---------- 渲染 ---------- */
function render() {
  const data = filterData();
  const regionDef = REGIONS.find(r => r.id === state.region);
  const isDrillRegion = (state.region === "cn" || state.region === "jp") && !state.query;

  // —— 分区磁贴视图：选择中国/日本后先显示分区，点击再进城市 ——
  if (isDrillRegion && !state.sub) {
    const subs = SUBREGIONS[state.region] || [];
    let html = `
      <div class="region-header">
        <h2>${regionDef.name}</h2>
        <span class="rh-en">// ${regionDef.en}</span>
        <span class="rh-line"></span>
      </div>
      <p class="tiles-hint">选择分区查看城市航线</p>
      <div class="sub-tiles">`;
    subs.forEach((sub, i) => {
      html += `
        <button class="sub-tile glass" data-sub="${sub.id}">
          <span class="st-idx">${String(i + 1).padStart(2, "0")}</span>
          <span class="st-main">
            <span class="st-name">${sub.name}</span>
            <span class="st-en">${sub.en}</span>
          </span>
          <span class="st-arrow">▸</span>
        </button>`;
    });
    html += `</div>`;
    $list.innerHTML = html;
    $empty.hidden = true;
    $count.innerHTML = `分区索引 <b>${subs.length}</b> / ${regionDef.en}`;
    return;
  }

  // —— 分区下钻视图：显示该分区城市 + 面包屑 ——
  if (isDrillRegion && state.sub) {
    const subDef = (SUBREGIONS[state.region] || []).find(x => x.id === state.sub);
    const group = data.filter(d => d.sub === state.sub);
    let html = `
      <div class="crumb">
        <button class="back-tiles">◂ 返回分区</button>
        <span class="crumb-path">${regionDef.name} <em>/</em> ${subDef ? subDef.name : ""} <em>/</em> ${subDef ? subDef.en : ""}</span>
        <span class="crumb-count">${group.length} CITIES</span>
      </div>
      <div class="route-grid">`;
    group.forEach(d => { html += cardHTML(d); });
    html += `</div>`;
    $list.innerHTML = html;
    $empty.hidden = group.length > 0;
    $count.innerHTML = `检索结果 <b>${group.length}</b> / ${DESTINATIONS.length} DESTINATIONS`;
    return;
  }

  // —— 常规视图：全部 / 东南亚 / 搜索结果 ——
  const grouped = {};
  data.forEach(d => {
    (grouped[d.region] = grouped[d.region] || []).push(d);
  });

  let html = "";
  REGIONS.forEach(r => {
    const items = grouped[r.id];
    if (!items || !items.length) return;
    // 日本 / 东南亚区域附加价格参考提示
    const note = (r.id === "jp" || r.id === "sea" || r.id === "am")
      ? `<span class="region-note">（国际价格变动，仅作参考）</span>` : "";
    html += `
      <div class="region-header">
        <h2>${r.name}</h2>
        <span class="rh-en">// ${r.en}</span>
        ${note}
        <span class="rh-line"></span>
      </div>`;

    // 二级分组（中国八大区 / 日本四岛；东南亚无二级分组）
    const subs = SUBREGIONS[r.id] || [];
    if (subs.length) {
      subs.forEach(sub => {
        const group = items.filter(d => d.sub === sub.id);
        if (!group.length) return;
        html += `
          <div class="sub-header">
            <span class="sh-name">${sub.name}</span>
            <span class="sh-en">// ${sub.en}</span>
            <span class="sh-count">${group.length}</span>
            <span class="sh-line"></span>
          </div>
          <div class="route-grid">`;
        group.forEach(d => { html += cardHTML(d); });
        html += `</div>`;
      });
    } else {
      html += `<div class="route-grid">`;
      items.forEach(d => { html += cardHTML(d); });
      html += `</div>`;
    }
  });

  $list.innerHTML = html;
  $empty.hidden = data.length > 0;
  $count.innerHTML = `检索结果 <b>${data.length}</b> / ${DESTINATIONS.length} DESTINATIONS`;
}

/* 卡片内航司代码芯片（按模式）；该航司在本目的地有运价时带金属质感 */
function chipsHTML(d, mode) {
  const keys = mode === "cgo" ? d.cgo : d.pax;
  const cls = mode === "cgo" ? "cargo-chip" : "pax-chip";
  return keys.map(k => {
    const a = AIRLINES[k];
    if (!a) return "";
    const hit = rateFor(k, d.code);
    const hasRate = !!hit;
    const tf = hit && hit.entry.transfer ? `<sup class="tf-badge">转机</sup>` : "";
    return `<span class="chip code-chip ${cls}${hasRate ? " metal" : ""}" title="${a.name} / ${a.en}${tf ? " · 转机" : ""}">${a.code}${tf}</span>`;
  }).join("");
}

function cardHTML(d) {
  const showPax = state.type !== "cgo" && d.pax.length;
  const showCgo = state.type !== "pax" && d.cgo.length;
  if (!showPax && !showCgo) return "";

  const defaultMode = showPax ? "pax" : "cgo";

  // 卡片右上类型标签：两种都有时可切换，只有一种时为固定标识
  const tabs = (showPax && showCgo) ? `
      <div class="card-tabs">
        <button class="card-tab active" data-mode="pax">客运</button>
        <button class="card-tab" data-mode="cgo">货运</button>
      </div>` : `
      <div class="card-tabs">
        <button class="card-tab active solo" data-mode="${defaultMode}">${showPax ? "客运" : "货运"}</button>
      </div>`;

  /* 费用扩展点（预留）：
     if (d.internalFee) { … } */

  return `
    <div class="route-card clickable" data-code="${d.code}" data-mode="${defaultMode}">
      ${tabs}
      <div class="route-head">
        <span class="route-city">${d.city}</span>
        <span class="route-code">${d.code}</span>
      </div>
      <div class="route-cityEn">${d.cityEn}</div>
      <div class="airline-chips">${chipsHTML(d, defaultMode)}</div>
      <button class="calc-btn" data-code="${d.code}">费用试算 <em>▸ FEE CALC</em></button>
    </div>`;
}

/* ============================================================
 * 费用试算模块
 * 费率参数（后续接入费率表时集中修改这里）：
 *   报关费：货值 × 0.165%，最低 ₩33,000，最高 ₩110,000
 *   装机费：₩110 / kg（按计费重 = max(实重, 泡重)）
 *   泡重：体积(cm³) ÷ 6000
 *   空运费：待接入（预留 AIR_FREIGHT_RATES 位置）
 * ============================================================ */
const CUSTOMS_RATE = 0.00165;
const CUSTOMS_MIN = 33000;
const CUSTOMS_MAX = 110000;
const HANDLING_RATE = 110;      // KRW/kg
const HANDLING_MIN = 33000;     // 装机费最低起算（2026-11-11）
const VOLUMETRIC_DIVISOR = 6000; // cm³/kg
const AIR_MARKUP = 1.3;         // 空运费统一系数（2026-11-11），对外不展示系数本身
/* 空运费已取消最低收费（原表 m 字段不再参与计算） */

/* ---------- 运价查询（多航司 · data.js 中的 AIR_FREIGHT_RATES）---------- */
const SEG_ORDER = ["n", "w45", "w100", "w300", "w500", "w1000"];
const SEG_LIMIT = { n: 0, w45: 45, w100: 100, w300: 300, w500: 500, w1000: 1000 };
const SEG_LABEL = { n: "N · <45K", w45: "+45K", w100: "+100K", w300: "+300K", w500: "+500K", w1000: "+1000K" };

/* 航司 key → 费率表条目（客运腹舱沿用同名货运表） */
function carrierEntry(airlineKey) {
  if (typeof AIR_FREIGHT_RATES === "undefined" || !airlineKey) return null;
  const c = AIR_FREIGHT_RATES.carriers || {};
  return c[airlineKey] || c[(AIR_FREIGHT_RATES.alias || {})[airlineKey]] || null;
}

/* 目的地行可覆盖的航司级字段（同一航司不同航线报价不同时） */
const ROW_OVERRIDE_KEYS = ["label", "effective", "fsc", "cgc", "allIn", "noMarkup", "transfer", "via"];

/* 指定航司 + 目的地是否有运价；返回的 entry 已合并目的地行的覆盖字段 */
function rateFor(airlineKey, destCode) {
  const base = carrierEntry(airlineKey);
  if (!base || !base.rates) return null;
  const table = base.rates[destCode];
  if (!table) return null;
  const entry = Object.assign({}, base);
  ROW_OVERRIDE_KEYS.forEach(k => { if (table[k] !== undefined) entry[k] = table[k]; });
  if (table.carrierNote !== undefined) entry.note = table.carrierNote;
  return { entry, table };
}

/* 按计费重选段；原表缺失的段位向上/向下就近取用并标记 */
function pickRate(table, weight) {
  let idx = 0;
  SEG_ORDER.forEach((k, i) => { if (weight >= SEG_LIMIT[k]) idx = i; });
  for (let i = idx; i >= 0; i--) {
    if (table[SEG_ORDER[i]] != null) return { unit: table[SEG_ORDER[i]], seg: SEG_ORDER[i], borrowed: i !== idx };
  }
  for (let i = idx + 1; i < SEG_ORDER.length; i++) {
    if (table[SEG_ORDER[i]] != null) return { unit: table[SEG_ORDER[i]], seg: SEG_ORDER[i], borrowed: true };
  }
  return null;
}

/* 地勤附加（CGC）合计：按 1 票 MAWB + 1 票 HAWB 计 */
function cgcTotal(entry) {
  return (entry && entry.cgc ? entry.cgc : []).reduce((s, x) => s + (x.amount || 0), 0);
}

/* ---------- 未来 7 日出发（依据班期推算）---------- */
const WD_CN = { Sun: "日", Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五", Sat: "六" };
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* 取某目的地 + 航司的航班（不区分客货；同航班号取班期最全的一条） */
function flightsFor(destCode, airlineKey) {
  if (!airlineKey) return [];
  const a = AIRLINES[airlineKey];
  if (!a) return [];
  const prefix = String(a.code).replace(/\s*Cargo$/i, "").trim();
  const auto = (typeof FLIGHT_DATA !== "undefined" && FLIGHT_DATA[destCode]) || [];
  const raw = auto.filter(f => f.no.startsWith(prefix));
  const cnt = x => (/daily/i.test(x.days) ? 7 : x.days.split(",").length);
  const byNo = {};
  raw.forEach(f => {
    if (!byNo[f.no] || cnt(f) > cnt(byNo[f.no])) byNo[f.no] = f;
  });
  // 手工补充班期优先（自动源没有的航班）；同号多条班期全部保留
  if (typeof MANUAL_FLIGHTS !== "undefined") {
    const manual = MANUAL_FLIGHTS[destCode + "|" + prefix] || [];
    manual.forEach(m => { delete byNo[m.no]; });
    manual.forEach((m, i) => { byNo[m.no + "#" + i] = m; });
  }
  return Object.values(byNo).sort((x, y) => x.dep.localeCompare(y.dep));
}

/* 未来 7 日内该批航班的出发日期与时点 */
function nextWeekDepartures(flights) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const wd = WD_EN[d.getDay()];
    const times = flights
      .filter(f => /daily/i.test(f.days) || f.days.split(",").includes(wd))
      .map(f => f.dep)
      .filter((v, k, s) => s.indexOf(v) === k)
      .sort();
    if (times.length) out.push({ date: d, wd, times });
  }
  return out;
}

/* 渲染「未来 7 日出发」条 */
function renderSchedule() {
  const el = document.getElementById("schedVal");
  if (!el || !currentDest) return;
  const airline = selectedCarrierKey && AIRLINES[selectedCarrierKey] ? AIRLINES[selectedCarrierKey] : null;

  if (!airline) {
    el.textContent = "请选择承运航班";
    el.className = "ss-val none";
    return;
  }

  const flights = flightsFor(currentDest.code, selectedCarrierKey);
  if (!flights.length) {
    el.textContent = `${airline.code} · 班期待确认`;
    el.className = "ss-val none";
    return;
  }

  const days = nextWeekDepartures(flights);
  if (!days.length) {
    el.textContent = `${airline.code} · 未来 7 日无班`;
    el.className = "ss-val none";
    return;
  }

  if (days.length === 7) {
    const times = [...new Set(days.flatMap(d => d.times))].sort();
    const shown = times.slice(0, 3).join(" / ") + (times.length > 3 ? ` 等 ${times.length} 班` : "");
    el.textContent = `每日 ${shown}`;
    el.className = "ss-val daily";
  } else {
    const one = d => {
      const times = d.times.slice(0, 2).join("/") + (d.times.length > 2 ? "+" + (d.times.length - 2) : "");
      return `${d.date.getMonth() + 1}/${d.date.getDate()}(周${WD_CN[d.wd]}) ${times}`;
    };
    const shown = days.slice(0, 4).map(one);
    el.textContent = shown.join(" · ") + (days.length > 4 ? ` 等 ${days.length} 天` : "");
    el.className = "ss-val";
  }

  const nos = flights.map(f => f.no).slice(0, 4).join(" ");
  el.title = `${airline.name} ${nos}${flights.length > 4 ? " 等" : ""} · 班期为班季计划，实际执飞以当日为准`;
}
/* 空运费费率表 AIR_FREIGHT_RATES 定义在 data.js（CZ 费率已接入） */

const $modal = document.getElementById("feeModal");
let currentDest = null;
let selectedCarrierKey = null;   // 弹窗内当前选中的承运航司 key

const won = n => "₩ " + Math.round(n).toLocaleString("en-US");
const num = id => parseFloat(document.getElementById(id).value) || 0;

function openFeeModal(code, mode) {
  currentDest = DESTINATIONS.find(d => d.code === code);
  if (!currentDest) return;

  /* 模式：优先用卡片当前标签页；无货运航线时强制客运模式 */
  const isCargoMode = mode ? mode === "cgo" : currentDest.cgo.length > 0;
  currentDest.__mode = isCargoMode ? "cgo" : "pax";

  // 承运航司选择：该目的地有运价的航司优先，否则选第一个
  const airlineKeys = isCargoMode ? currentDest.cgo : currentDest.pax;
  const hasRate = k => !!rateFor(k, currentDest.code);
  const preferred = airlineKeys.find(hasRate) || airlineKeys[0];
  selectedCarrierKey = preferred || null;
  const $carrier = document.getElementById("carrierSelect");
  $carrier.innerHTML = airlineKeys.map(k => {
    const a = AIRLINES[k];
    if (!a) return "";
    const sel = k === selectedCarrierKey ? " selected" : "";
    const metal = hasRate(k) ? " metal" : "";
    const hit = rateFor(k, currentDest.code);
    const tf = hit && hit.entry.transfer
      ? `<span class="tf-badge cc-tf" title="${hit.entry.via ? "经 " + hit.entry.via + " 中转" : "非直飞，转机"}">转机</span>` : "";
    return `<button class="chip carrier-chip${sel}${metal}" data-key="${k}" data-name="${a.name}">
      <span class="cc-name">${a.name}</span>
      <span class="cc-code">${a.code}${tf}</span>
    </button>`;
  }).join("") || `<span class="chip">暂无航线信息</span>`;

  document.getElementById("feeRouteTitle").innerHTML =
    `${currentDest.city} <span class="route-code">${currentDest.code}</span>`;
  document.getElementById("feeRouteSub").textContent =
    `ICN → ${currentDest.cityEn} · ${isCargoMode ? "货运" : "客运"} · 已选承运：${selectedCarrierKey && AIRLINES[selectedCarrierKey] ? AIRLINES[selectedCarrierKey].name : "—"}`;
  document.getElementById("feeAvLink").hidden = !selectedCarrierKey;

  // 托盘按钮：客运模式置灰，货运模式恢复
  const palletBtn = document.getElementById("pkgPalletBtn");
  const pkgMode = document.getElementById("pkgMode");
  if (isCargoMode) {
    palletBtn.classList.remove("disabled");
    palletBtn.disabled = false;
    pkgMode.textContent = "";
    pkgMode.title = "";
  } else {
    palletBtn.classList.add("disabled");
    palletBtn.disabled = true;
    pkgMode.textContent = "· 客运航线不支持托盘";
    pkgMode.title = "客运航线仅支持纸箱/木箱";
    // 若托盘之前被选中，重置回纸箱
    if (palletBtn.classList.contains("active")) {
      document.querySelectorAll("#pkgType .seg-btn").forEach(b => b.classList.remove("active"));
      document.querySelector('#pkgType [data-pkg="carton"]').classList.add("active");
    }
  }

  // 重置输入
  ["inValue", "inWeight", "inVolume"].forEach(id => document.getElementById(id).value = "");
  calcFees();
  renderSchedule();
  setFeePage(1);
  cdOnOpen();
  $modal.hidden = false;
}

function calcFees() {
  const value = num("inValue");
  const weight = num("inWeight");
  const volume = num("inVolume") * 1000000; // 输入为立方米，换算成 cm³

  /* —— 报关费 —— */
  const customsEl = document.getElementById("feeCustoms");
  const customsNote = document.getElementById("feeCustomsNote");
  let customs = 0;
  if (value > 0) {
    customs = Math.min(Math.max(value * CUSTOMS_RATE, CUSTOMS_MIN), CUSTOMS_MAX);
    customsEl.textContent = won(customs);
    const raw = value * CUSTOMS_RATE;
    customsNote.textContent = raw < CUSTOMS_MIN
      ? `按 0.165% = ${won(raw)}，低于最低值，取 ₩33,000`
      : raw > CUSTOMS_MAX
        ? `按 0.165% = ${won(raw)}，超过最高值，取 ₩110,000`
        : `货值 ${won(value)} × 0.165%`;
  } else {
    customsEl.textContent = "—";
    customsNote.textContent = "⬆ 请先输入货值 · 0.165%，最低 ₩33,000 / 最高 ₩110,000";
  }

  /* —— 装机费（实重 vs 泡重）—— */
  const actual = weight;
  const volumetric = volume > 0 ? volume / VOLUMETRIC_DIVISOR : 0;
  document.getElementById("wsActual").textContent = actual > 0 ? actual.toLocaleString() + " kg" : "— kg";
  document.getElementById("wsVolume").textContent = volumetric > 0 ? volumetric.toFixed(1) + " kg" : "— kg";

  const handlingEl = document.getElementById("feeHandling");
  const handlingNote = document.getElementById("feeHandlingNote");
  let handling = 0;
  if (actual > 0 || volumetric > 0) {
    const chargeable = Math.max(actual, volumetric);
    const byActual = HANDLING_RATE * actual;
    const byVolume = HANDLING_RATE * volumetric;
    handling = HANDLING_RATE * chargeable;
    const minApplied = handling < HANDLING_MIN;
    if (minApplied) handling = HANDLING_MIN;
    handlingEl.textContent = won(handling);
    handlingNote.innerHTML =
      `实重计费：${won(byActual)} ／ 泡重计费：${won(byVolume)}<br>` +
      `计费重取较大者 → <b>${chargeable.toFixed(1)} kg × ₩110</b>` +
      (minApplied ? ` · 不足 ₩33,000，按 <b>₩33,000</b> 起算` : "");
  } else {
    handlingEl.textContent = "—";
    handlingNote.textContent = "请输入重量或体积 · ₩110 / kg，最低 ₩33,000";
  }

  /* —— 空运费 + 附加费（按所选航司与目的地的费率表）—— */
  const airEl = document.getElementById("feeAir");
  const airNote = document.getElementById("feeAirNote");
  const fscRow = document.getElementById("fscRow");
  const fscEl = document.getElementById("feeFsc");
  const fscNote = document.getElementById("feeFscNote");
  const cgcRow = document.getElementById("cgcRow");
  const cgcEl = document.getElementById("feeCgc");
  const cgcNote = document.getElementById("feeCgcNote");
  const chargeable = Math.max(actual, volumetric);
  const hit = rateFor(selectedCarrierKey, currentDest.code);
  const entry = hit ? hit.entry : carrierEntry(selectedCarrierKey);
  const carrierName = selectedCarrierKey && AIRLINES[selectedCarrierKey] ? AIRLINES[selectedCarrierKey].name : "—";
  let airFreight = 0, fsc = 0, cgc = 0;

  fscRow.hidden = true;
  cgcRow.hidden = true;

  if (!entry) {
    // 该航司未录入任何运价
    airEl.textContent = "运价待确认";
    airEl.classList.add("pending");
    airNote.textContent = `「${carrierName}」运价尚未录入 — 接入费率表后自动计算并计入合计`;
  } else if (!hit) {
    airEl.textContent = "暂无运价";
    airEl.classList.add("pending");
    airNote.textContent = `「${carrierName}」未录入 ${currentDest.code} 的费率 — 待费率表补充`;
  } else if (chargeable <= 0) {
    airEl.textContent = "待输入重量";
    airEl.classList.add("pending");
    airNote.textContent =
      `「${carrierName}」费率已录入 · 输入重量/体积后显示单价与总价`;
  } else {
    const pick = pickRate(hit.table, chargeable);
    if (!pick) {
      airEl.textContent = "暂无运价";
      airEl.classList.add("pending");
      airNote.textContent = `「${carrierName}」费率表缺少可用段位 — 待补充`;
    } else {
      /* 对外单价 = 表内费率 × 系数（noMarkup 表示已是对外价）；已取消最低收费 */
      const unit = pick.unit * (entry.noMarkup ? 1 : AIR_MARKUP);
      airFreight = chargeable * unit;
      airEl.textContent = won(airFreight);
      airEl.classList.remove("pending");

      airNote.innerHTML =
        `「${carrierName}」单价 <b>${won(unit)}/kg</b>（${SEG_LABEL[pick.seg]} 段）× 计费重 ${chargeable.toLocaleString()}kg` +
        (pick.borrowed ? ` · 原表未列该重量段，按 ${SEG_LABEL[pick.seg]} 费率计` : "") +
        (entry.transfer ? ` · <span class="tf-badge">转机</span>${entry.via ? ` 经 ${entry.via}` : ""}` : "") +
        `<br>费率：${entry.label}（${entry.effective}）` +
        (entry.note ? ` · ${entry.note}` : "") +
        (hit.table.note ? `<br>${hit.table.note}` : "") +
        `<br><span class="note-warn">${AIR_FREIGHT_RATES.disclaimer}</span>`;

      /* 燃油附加 FSC */
      const fscRate = entry.allIn ? 0 : (entry.fsc || 0);
      if (fscRate > 0) {
        fsc = Math.round(chargeable * fscRate);
        fscRow.hidden = false;
        fscEl.textContent = won(fsc);
        fscNote.textContent = `计费重 ${chargeable.toLocaleString()}kg × ${won(fscRate)}/kg · 随油价浮动`;
      }

      /* 地勤附加 CGC（固定金额，按票计） */
      cgc = cgcTotal(entry);
      if (cgc > 0) {
        cgcRow.hidden = false;
        cgcEl.textContent = won(cgc);
        cgcNote.textContent =
          `CGC 明细：${entry.cgc.map(x => `${x.label} ${won(x.amount)}`).join(" + ")} · ` +
          (entry.cgc.length > 1 ? "按 1 票 MAWB + 1 票 HAWB 计，多票另加" : "按 1 票计，多票另加");
      }
    }
  }

  /* —— 合计 —— */
  const total = customs + handling + airFreight + fsc + cgc;
  document.getElementById("feeTotal").textContent = won(total);
  document.getElementById("ftNote").textContent = airFreight > 0
    ? `TOTAL（报关 + 装机 + 空运${fsc ? " + 燃油" : ""}${cgc ? " + 地勤" : ""}）`
    : "SUBTOTAL（空运费待确认，未计入）";
}

/* ---------- 弹窗事件 ---------- */
document.getElementById("feeClose").addEventListener("click", () => { $modal.hidden = true; });
let maskDown = false;
$modal.addEventListener("mousedown", e => { maskDown = e.target === $modal; });
$modal.addEventListener("click", e => { if (e.target === $modal && maskDown) $modal.hidden = true; maskDown = false; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $modal.hidden = true; });

/* 查看所选航班详情 */
document.getElementById("feeAvLink").addEventListener("click", () => {
  if (selectedCarrierKey) openAirlineView(selectedCarrierKey);
});

["inValue", "inWeight", "inVolume"].forEach(id =>
  document.getElementById(id).addEventListener("input", calcFees)
);

document.getElementById("pkgType").addEventListener("click", e => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  document.querySelectorAll("#pkgType .seg-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
});

/* 承运航司选择：凹陷按压感 → 选中并重算费用与班期（不跳转） */
document.getElementById("carrierSelect").addEventListener("click", e => {
  const chip = e.target.closest(".carrier-chip");
  if (!chip) return;
  document.querySelectorAll("#carrierSelect .carrier-chip").forEach(c => c.classList.remove("selected"));
  chip.classList.add("selected");
  selectedCarrierKey = chip.dataset.key;
  const sub = document.getElementById("feeRouteSub");
  sub.textContent = sub.textContent.replace(/已选承运：.+$/, `已选承运：${chip.dataset.name}`);
  calcFees();
  renderSchedule();
});

/* ---------- 航班详情界面 ---------- */
function openAirlineView(key) {
  const a = AIRLINES[key];
  if (!a) return;
  const paxDests = DESTINATIONS.filter(d => d.pax.includes(key));
  const cgoDests = DESTINATIONS.filter(d => d.cgo.includes(key));
  const entry = carrierEntry(key);
  const priced = entry ? Object.keys(entry.rates || {}) : [];

  document.getElementById("avCode").textContent = a.code;
  document.getElementById("avName").textContent = a.name;
  document.getElementById("avEn").textContent = a.en;
  document.getElementById("avRate").innerHTML = entry
    ? `<span class="av-rate-ok">★ 已录入 ${priced.length} 条运价</span><br><em>${entry.label} · ${entry.effective}</em>`
    : `<span class="av-rate-none">运价待接入</span>`;

  const destChip = d =>
    `<span class="chip code-chip${priced.includes(d.code) ? " metal" : ""}" title="${d.city} ${d.cityEn}">${d.code}</span>`;
  document.getElementById("avPax").innerHTML =
    paxDests.map(destChip).join("") || `<span class="av-empty">暂无</span>`;
  document.getElementById("avCgo").innerHTML =
    cgoDests.map(destChip).join("") || `<span class="av-empty">暂无</span>`;

  document.querySelector(".result-area").hidden = true;
  document.querySelector(".control-wrap").hidden = true;
  document.getElementById("feeModal").hidden = true;
  document.getElementById("airlineView").hidden = false;
  window.scrollTo({ top: 0 });
}

document.getElementById("avBack").addEventListener("click", () => {
  document.getElementById("airlineView").hidden = true;
  document.querySelector(".result-area").hidden = false;
  document.querySelector(".control-wrap").hidden = false;
});

/* 卡片交互：分区磁贴 / 类型标签切换 / 点击卡片打开费用试算（事件委托） */
document.getElementById("routeList").addEventListener("click", e => {
  // 分区磁贴：进入该分区城市视图
  const tile = e.target.closest(".sub-tile");
  if (tile) { state.sub = tile.dataset.sub; render(); return; }

  // 面包屑返回：回到分区磁贴
  const back = e.target.closest(".back-tiles");
  if (back) { state.sub = null; render(); return; }

  const card = e.target.closest(".route-card");
  if (!card) return;

  // 点击类型标签：就地切换该卡片的客运/货运显示
  const tab = e.target.closest(".card-tab");
  if (tab && !tab.classList.contains("solo")) {
    const d = DESTINATIONS.find(x => x.code === card.dataset.code);
    if (!d) return;
    const mode = tab.dataset.mode;
    card.dataset.mode = mode;
    card.querySelectorAll(".card-tab").forEach(t => t.classList.toggle("active", t === tab));
    card.querySelector(".airline-chips").innerHTML = chipsHTML(d, mode);
    return;
  }

  // 点击卡片其他区域：打开费用试算（携带当前标签页模式）
  openFeeModal(card.dataset.code, card.dataset.mode);
});

/* ---------- 事件绑定 ---------- */
function bindSegGroup(id, key) {
  const group = document.getElementById(id);
  group.addEventListener("click", e => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    group.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state[key] = btn.dataset[key];
    if (key === "region") state.sub = null;  // 切换区域时回到分区磁贴
    render();
  });
}

document.getElementById("searchInput").addEventListener("input", e => {
  state.query = e.target.value;
  render();
});

bindSegGroup("typeFilter", "type");
bindSegGroup("regionFilter", "region");

/* ---------- 启动 ---------- */
updateStats();
render();
const el = document.getElementById("dataUpdated");
if (el && typeof DATA_UPDATED !== "undefined") el.textContent = DATA_UPDATED;

/* ---------- 预订通知 ---------- */
const BOOKING_ENDPOINT = "https://yunda-booking.yundakorea.workers.dev";
document.getElementById("bkSend").addEventListener("click", async () => {
  const st = document.getElementById("bkStatus"), btn = document.getElementById("bkSend");
  const group = document.getElementById("bkGroup").value.trim();
  const cargo = document.getElementById("bkCargo").value.trim();
  st.className = "bk-status";
  if (!group || !cargo) { st.textContent = "请填写企微群名和货量"; st.classList.add("err"); return; }
  const txt = id => (document.getElementById(id)?.textContent || "").trim();
  const actChip = document.querySelector("#carrierSelect .carrier-chip.selected");
  const w = document.getElementById("inWeight").value, v = document.getElementById("inVolume").value;
  const payload = {
    group, cargo, goods: document.getElementById("bkGoods").value.trim(), date: document.getElementById("bkDate").value, hp: document.getElementById("bkHp").value,
    dest: [txt("feeRouteTitle"), txt("feeRouteSub")].filter(Boolean).join(" · "),
    carrier: actChip ? actChip.textContent.replace(/\s+/g, " ").trim() : "",
    weight: w ? w + " kg" : "", volume: v ? v + " CBM" : "",
    cw: [txt("wsActual"), txt("wsVolume")].some(x => x && x !== "— kg") ? `实重 ${txt("wsActual")} / 泡重 ${txt("wsVolume")}` : "",
    total: txt("feeTotal") !== "₩ 0" ? txt("feeTotal") : ""
  };
  btn.disabled = true; st.textContent = "发送中…";
  try {
    const r = await fetch(BOOKING_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { st.textContent = "已发送，我们会尽快与您联系 ✓"; st.classList.add("ok"); document.getElementById("bkCargo").value = ""; }
    else { st.textContent = j.err || "发送失败，请稍后再试或直接在群里联系我们"; st.classList.add("err"); }
  } catch (e) { st.textContent = "网络错误，请稍后再试或直接在群里联系我们"; st.classList.add("err"); }
  btn.disabled = false;
});

/* ---------- 弹窗分页 1/2 ---------- */
function setFeePage(n) {
  n = String(n);
  document.querySelectorAll("#feeModal .fee-page").forEach(p => { p.hidden = p.dataset.page !== n; });
  document.querySelectorAll("#feePageTabs .page-tab").forEach(t => t.classList.toggle("active", t.dataset.page === n));
  const ind = document.getElementById("feePageInd");
  if (ind) ind.textContent = n + " / 2";
  const m = document.querySelector("#feeModal .modal");
  if (m) m.scrollTop = 0;
}
document.getElementById("feePageTabs").addEventListener("click", e => {
  const t = e.target.closest(".page-tab");
  if (t) setFeePage(t.dataset.page);
});
document.querySelectorAll("#feeModal .page-next").forEach(b => b.addEventListener("click", () => setFeePage(b.dataset.goto)));

/* ---------- 报关单申请（表格上传 / 表格制作） ---------- */
const CD_ENDPOINT = BOOKING_ENDPOINT + "/file";
const CD_MAX = 20 * 1024 * 1024;
const CD_EXT = ["xlsx", "xls", "pdf", "csv", "doc", "docx", "jpg", "jpeg", "png", "zip"];
const $cd = id => document.getElementById(id);
const HAS_KO = /[\uac00-\ud7af\u3130-\u318f]/;
let cdLines = [];        // {marks, cat, desc, qty, price, amt, fixed}
let cdDetail = [];       // 购买明细原始行
let cdGoodsMode = "lines";

/* 群名两处同步 */
$cd("bkGroup").addEventListener("input", e => { $cd("cdGroup").value = e.target.value; });
$cd("cdGroup").addEventListener("input", e => { $cd("bkGroup").value = e.target.value; });

function cdDestDefault() {
  if (!currentDest) return "";
  const en = (currentDest.cityEn || "").toUpperCase();
  const special = { HKG: "HONG KONG", MFM: "MACAU", TPE: "TAIPEI, TAIWAN", KHH: "KAOHSIUNG, TAIWAN" };
  if (special[currentDest.code]) return special[currentDest.code];
  const country = { cn: "CHINA", jp: "JAPAN" }[currentDest.region];
  return country ? `${en}, ${country}` : en;
}
function cdOnOpen() {
  const d = cdDestDefault();
  const el = $cd("cdDest");
  if (!el.dataset.touched) el.value = d;
  if (!$cd("cdDate").value) $cd("cdDate").value = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}
$cd("cdDest").addEventListener("input", e => { e.target.dataset.touched = "1"; });

/* 模式切换 */
$cd("cdMode").addEventListener("click", e => {
  const b = e.target.closest(".seg-btn"); if (!b) return;
  $cd("cdMode").querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b));
  $cd("cdUpload").hidden = b.dataset.cd !== "upload";
  $cd("cdMake").hidden = b.dataset.cd !== "make";
});
$cd("cdGoodsMode").addEventListener("click", e => {
  const b = e.target.closest(".seg-btn"); if (!b) return;
  $cd("cdGoodsMode").querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b));
  cdGoodsMode = b.dataset.gm;
  $cd("cdPasteLines").hidden = cdGoodsMode !== "lines";
  $cd("cdPasteDetail").hidden = cdGoodsMode !== "detail";
  if (cdGoodsMode === "detail") { $cd("cdCur").value = "KRW"; }
  else { cdDetail = []; cdLines = cdLines.filter(l => !l.fixed); if (!cdLines.length) cdLines.push(cdBlank()); }
  cdRender();
});

/* ---------- 通用发送 ---------- */
async function cdPost(fd) {
  const r = await fetch(CD_ENDPOINT, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!(r.ok && j.ok)) throw new Error(j.err || "发送失败");
  return j;
}
function cdStatus(id, text, cls) { const st = $cd(id); st.className = "bk-status" + (cls ? " " + cls : ""); st.innerHTML = text; }
function cdDestText() {
  return [document.getElementById("feeRouteTitle").textContent.trim(), $cd("cdDest").value.trim()].filter(Boolean).join(" · ");
}

/* ---------- 表格上传 ---------- */
const cdDrop = $cd("cdDrop");
["dragenter", "dragover"].forEach(ev => cdDrop.addEventListener(ev, () => cdDrop.classList.add("drag")));
["dragleave", "drop"].forEach(ev => cdDrop.addEventListener(ev, () => cdDrop.classList.remove("drag")));
function cdCheckFile(f) {
  if (!f) return "请先选择文件";
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!CD_EXT.includes(ext)) return "不支持该文件类型，请上传 Excel / PDF / Word / 图片 / ZIP";
  if (f.size > CD_MAX) return "文件超过 20MB，请压缩后再上传";
  if (f.size <= 5) return "文件为空";
  return "";
}
$cd("cdFile").addEventListener("change", e => {
  const f = e.target.files[0];
  const err = f ? cdCheckFile(f) : "";
  $cd("cdFileName").textContent = f ? `${f.name}（${(f.size / 1024).toFixed(1)} KB）` : "点击选择或拖入文件";
  cdDrop.classList.toggle("has", !!f && !err);
  cdStatus("cdUpStatus", err, err ? "err" : "");
});
$cd("cdUpSend").addEventListener("click", async () => {
  const f = $cd("cdFile").files[0], group = $cd("cdGroup").value.trim(), btn = $cd("cdUpSend");
  if (!group) return cdStatus("cdUpStatus", "请填写企微群名", "err");
  const err = cdCheckFile(f); if (err) return cdStatus("cdUpStatus", err, "err");
  const fd = new FormData();
  fd.append("file", f, f.name); fd.append("filename", f.name); fd.append("group", group);
  fd.append("kind", "表格上传（客户自有表格）"); fd.append("dest", cdDestText());
  fd.append("note", $cd("cdUpNote").value.trim()); fd.append("hp", $cd("bkHp").value);
  btn.disabled = true; cdStatus("cdUpStatus", "上传中…");
  try { await cdPost(fd); cdStatus("cdUpStatus", "已发送到企微群 ✓ 我们会尽快处理", "ok"); }
  catch (e) { cdStatus("cdUpStatus", (e.message || "发送失败") + "，请稍后再试或直接在群里发给我们", "err"); }
  btn.disabled = false;
});

/* ---------- 表格制作：货物明细 ---------- */
const cdBlank = () => ({ marks: "", cat: "", desc: "", qty: "", price: "", amt: 0, fixed: false });
const cdNum = v => { const n = parseFloat(String(v ?? "").replace(/[,₩$¥\s]/g, "")); return isFinite(n) ? n : 0; };
const cdRound = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
const cdDec = () => ($cd("cdCur").value === "KRW" ? 0 : 2);
const cdFmt = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: cdDec() === 0 ? 2 : 2, minimumFractionDigits: cdDec() });
const cdEsc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function cdCalc(l) {
  if (l.fixed) { const q = cdNum(l.qty) || 1; l.price = cdRound(l.amt / q, 2); }
  else l.amt = cdRound(cdNum(l.qty) * cdNum(l.price), 2);
}
function cdRender() {
  const box = $cd("cdLines");
  box.innerHTML = cdLines.map((l, i) => {
    cdCalc(l);
    const ko = k => HAS_KO.test(l[k]) ? " ko" : "";
    return `<div class="cd-line" data-i="${i}">
      <input data-k="marks" value="${cdEsc(l.marks)}" placeholder="Marks" maxlength="40">
      <input data-k="cat" class="${ko("cat")}" value="${cdEsc(l.cat)}" placeholder="类别 如 Cosmetics" maxlength="40">
      <input data-k="desc" class="${ko("desc")}" value="${cdEsc(l.desc)}" placeholder="英文品名 如 Clothing" maxlength="200">
      <input data-k="qty" type="number" min="0" step="any" value="${cdEsc(l.qty)}" placeholder="数量">
      <input data-k="price" type="number" min="0" step="any" value="${cdEsc(l.price)}" placeholder="单价"${l.fixed ? ' disabled title="按申报金额 ÷ 数量 自动计算"' : ""}>
      <span class="amt" data-amt>${cdFmt(l.amt)}</span>
      <button class="del" title="删除">✕</button>
    </div>`;
  }).join("");
  cdTotals();
}
function cdTotals() {
  const q = cdLines.reduce((s, l) => s + cdNum(l.qty), 0), a = cdLines.reduce((s, l) => s + (l.amt || 0), 0);
  const koRows = cdLines.map((l, i) => (HAS_KO.test(l.desc) || HAS_KO.test(l.cat)) ? i + 1 : 0).filter(Boolean);
  $cd("cdTotal").innerHTML = `合计 ${q.toLocaleString("en-US")} EA · ${$cd("cdCur").value} ${cdFmt(a)}` +
    (koRows.length ? `<br><span style="color:#f87171">第 ${koRows.join("、")} 行仍含韩文，请改成英文</span>` : "");
}
$cd("cdLines").addEventListener("input", e => {
  const inp = e.target.closest("input"), row = e.target.closest(".cd-line"); if (!inp || !row) return;
  const l = cdLines[+row.dataset.i]; l[inp.dataset.k] = inp.value;
  cdCalc(l);
  row.querySelector("[data-amt]").textContent = cdFmt(l.amt);
  if (l.fixed) row.querySelector('[data-k="price"]').value = l.price;
  if (inp.dataset.k === "desc" || inp.dataset.k === "cat") inp.classList.toggle("ko", HAS_KO.test(inp.value));
  cdTotals();
});
$cd("cdLines").addEventListener("click", e => {
  const del = e.target.closest(".del"); if (!del) return;
  cdLines.splice(+del.closest(".cd-line").dataset.i, 1);
  if (!cdLines.length) cdLines.push(cdBlank());
  cdRender();
});
$cd("cdAddLine").addEventListener("click", () => { cdLines.push(cdBlank()); cdRender(); });
$cd("cdCur").addEventListener("change", cdRender);

/* 从 Excel 粘贴：品名 ⇥ 数量 ⇥ 单价 */
$cd("cdPasteBtn").addEventListener("click", () => {
  const rows = $cd("cdPasteTxt").value.split(/\r?\n/).map(r => r.split("\t").map(x => x.trim())).filter(r => r.some(Boolean));
  const add = [];
  rows.forEach(r => {
    if (r.length === 1) { add.push({ ...cdBlank(), desc: r[0] }); return; }
    const nums = r.map(cdNum);
    const isNum = x => x !== undefined && x !== "" && !isNaN(parseFloat(String(x).replace(/[,₩$¥\s]/g, "")));
    if (!r[0] || (!isNum(r[1]) && !isNum(r[2]))) return; // 跳过表头 / 空行
    add.push({ ...cdBlank(), desc: r[0], qty: r[1] ? String(nums[1]) : "", price: r[2] ? String(nums[2]) : "" });
  });
  if (!add.length) return;
  cdLines = cdLines.filter(l => l.desc || l.qty || l.price || l.marks).concat(add);
  $cd("cdPasteTxt").value = "";
  cdRender();
});

/* ---------- 购买明细：韩→英 ---------- */
const KO_CAT = { "화장품": "Cosmetics", "의류": "Clothing", "옷": "Clothing", "가방": "Bag", "신발": "Shoes", "구두": "Shoes", "시계": "Watch", "향수": "Perfume",
  "주얼리": "Jewelry", "쥬얼리": "Jewelry", "보석": "Jewelry", "액세서리": "Accessories", "악세서리": "Accessories", "잡화": "Sundries", "지갑": "Wallet", "벨트": "Belt",
  "스카프": "Scarf", "모자": "Hat", "선글라스": "Sunglasses", "안경": "Glasses", "건강식품": "Health Food", "식품": "Food", "전자제품": "Electronics", "주류": "Liquor", "담배": "Tobacco", "완구": "Toys", "생활용품": "Household Goods" };
const KO_BRAND = { "샤넬": "CHANEL", "디올": "DIOR", "디올뷰티": "DIOR BEAUTY", "에스티로더": "ESTEE LAUDER", "랑콤": "LANCOME", "설화수": "SULWHASOO", "후": "WHOO", "입생로랑": "YSL",
  "겔랑": "GUERLAIN", "에르메스": "HERMES", "구찌": "GUCCI", "루이비통": "LOUIS VUITTON", "프라다": "PRADA", "버버리": "BURBERRY", "톰포드": "TOM FORD", "조말론": "JO MALONE",
  "키엘": "KIEHL'S", "맥": "MAC", "시세이도": "SHISEIDO", "클리니크": "CLINIQUE", "바비브라운": "BOBBI BROWN", "나스": "NARS", "헤라": "HERA", "아이오페": "IOPE", "라네즈": "LANEIGE",
  "이니스프리": "INNISFREE", "롤렉스": "ROLEX", "까르띠에": "CARTIER", "몽블랑": "MONTBLANC", "나이키": "NIKE", "아디다스": "ADIDAS", "발렌시아가": "BALENCIAGA", "생로랑": "SAINT LAURENT",
  "셀린느": "CELINE", "보테가베네타": "BOTTEGA VENETA", "펜디": "FENDI", "미우미우": "MIU MIU", "지방시": "GIVENCHY", "아르마니": "ARMANI", "끌로에": "CHLOE", "티파니": "TIFFANY",
  "불가리": "BVLGARI", "오메가": "OMEGA", "코치": "COACH", "마크제이콥스": "MARC JACOBS", "크리드": "CREED", "딥티크": "DIPTYQUE", "르라보": "LE LABO", "시슬리": "SISLEY", "라메르": "LA MER" };
const KO_WORD = { "각종": "Various", "향수": "perfumes", "클렌징": "cleansers", "클렌저": "cleansers", "립스틱": "lipsticks", "크림": "creams", "뷰티": "Beauty", "셔도": "shadow", "섀도": "shadow",
  "아이섀도": "eyeshadow", "파운데이션": "foundation", "쿠션": "cushion", "에센스": "essence", "세럼": "serum", "로션": "lotion", "토너": "toner", "스킨": "skin toner", "마스카라": "mascara",
  "선크림": "sunscreen", "마스크팩": "mask packs", "마스크": "masks", "핸드크림": "hand cream", "바디": "body", "립밤": "lip balm", "틴트": "lip tint", "파우더": "powder", "블러셔": "blusher",
  "세트": "set", "기초": "skincare", "색조": "makeup", "화장품": "cosmetics", "앰플": "ampoule", "미스트": "mist", "오일": "oil", "샴푸": "shampoo", "가방": "bags", "지갑": "wallets",
  "신발": "shoes", "의류": "clothing", "시계": "watches", "벨트": "belts", "스카프": "scarves", "선글라스": "sunglasses", "및": "and", "외": "etc.", "용": "for", "남성": "men's", "여성": "women's" };
function koTranslate(text) {
  let t = String(text || "").trim();
  if (!HAS_KO.test(t)) return t;
  const out = [];
  t.split(/\s+/).forEach(tok => {
    let etc = false;
    if (tok.length > 1 && /등$/.test(tok)) { tok = tok.slice(0, -1); etc = true; }
    if (tok === "등") { out.push("etc."); return; }
    let en = KO_WORD[tok] || (KO_BRAND[tok] ? KO_BRAND[tok].replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()) : null);
    if (!en) {   // 品牌前缀 + 词，如 디올뷰티
      const b = Object.keys(KO_BRAND).sort((a, b) => b.length - a.length).find(k => tok.startsWith(k));
      if (b) { const rest = tok.slice(b.length); en = KO_BRAND[b].replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()) + (rest ? " " + (KO_WORD[rest] || rest) : ""); }
    }
    out.push(en || tok);
    if (etc) out.push("etc.");
  });
  return out.join(" ").replace(/\s+etc\.$/, ", etc.").replace(/ (perfumes|cleansers|lipsticks|creams|cushion|serum|lotion|toner)(?= [a-z])/g, " $1,").trim();
}
const DETAIL_COLS = ["no", "buyer", "store", "date", "appr", "pay", "origin", "cat", "brand", "name"];
const DETAIL_HDR = { "NO": "no", "NO.": "no", "번호": "no", "매입담당": "buyer", "가맹점명": "store", "매입일자": "date", "승인번호": "appr", "결제액": "pay", "원산지": "origin", "제품구분": "cat", "상품브랜드": "brand", "브랜드": "brand", "상품명": "name" };
function parseDetail(txt) {
  const rows = txt.split(/\r?\n/).map(r => r.split("\t").map(x => x.trim()));
  let map = null; const out = [];
  rows.forEach(r => {
    if (!r.some(Boolean)) return;
    const hdrHits = r.filter(c => DETAIL_HDR[c.replace(/\s+/g, "")] || DETAIL_HDR[c.toUpperCase()]).length;
    if (hdrHits >= 3) { map = r.map(c => DETAIL_HDR[c.replace(/\s+/g, "")] || DETAIL_HDR[c.toUpperCase()] || null); return; }
    const m = map || DETAIL_COLS;
    const o = {}; m.forEach((k, i) => { if (k && !(k in o)) o[k] = r[i] ?? ""; });
    const pay = cdNum(o.pay);
    if (!pay || (!o.appr && !o.name)) return;   // 标题行 / 合计行
    o.pay = pay; out.push(o);
  });
  return out;
}
function cdJoinBrand(brand, name) {
  if (!brand) return name;
  if (name.toUpperCase().startsWith(brand.toUpperCase() + " ")) return brand + name.slice(brand.length);
  return [brand, name].filter(Boolean).join(" ");
}
$cd("cdDetailBtn").addEventListener("click", () => {
  const rows = parseDetail($cd("cdDetailTxt").value);
  if (!rows.length) { cdStatus("cdMkStatus", "没有识别到明细行，请从表格复制整块（含 결제액 列）后粘贴", "err"); return; }
  cdDetail = rows;
  cdLines = rows.map(o => {
    let name = String(o.name || "").trim(), qty = 1;
    const m = name.match(/\s*[*×xX]\s*(\d+)\s*$/);
    if (m) { qty = +m[1]; name = name.slice(0, m.index).trim(); }
    const brand = String(o.brand || "").trim();
    const brandEn = HAS_KO.test(brand) ? (KO_BRAND[brand] || brand) : brand.toUpperCase();
    const amt = Math.round(o.pay * 0.945 / 10000) * 10000;
    return { marks: o.appr || "", cat: KO_CAT[String(o.cat || "").trim()] || String(o.cat || "").trim(), desc: cdJoinBrand(brandEn, koTranslate(name)), qty: String(qty), price: "", amt, fixed: true };
  });
  $cd("cdCur").value = "KRW";
  cdRender();
  cdStatus("cdMkStatus", `已解析 ${rows.length} 行明细，申报金额合计 KRW ${cdFmt(cdLines.reduce((s, l) => s + l.amt, 0))}`, "ok");
});

/* ---------- 生成 Excel（ExcelJS，按需加载） ---------- */
let excelJsP = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (excelJsP) return excelJsP;
  const urls = ["https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js", "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js"];
  excelJsP = urls.reduce((p, u) => p.catch(() => new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = u; s.onload = () => window.ExcelJS ? res(window.ExcelJS) : rej(); s.onerror = rej; document.head.appendChild(s);
  })), Promise.reject()).catch(e => { excelJsP = null; throw new Error("表格组件加载失败，请检查网络后重试"); });
  return excelJsP;
}
function cdCollect() {
  const v = id => $cd(id).value.trim();
  return {
    sh: { name: v("cdShName"), addr: v("cdShAddr"), tel: v("cdShTel"), attn: v("cdShAttn"), tax: v("cdShTax") },
    co: { name: v("cdCoName"), addr: v("cdCoAddr"), tel: v("cdCoTel"), attn: v("cdCoAttn") },
    invNo: v("cdInvNo"), date: v("cdDate"), terms: v("cdTerms"), pol: v("cdPol"), dest: v("cdDest"), cur: v("cdCur"),
    lines: cdLines.filter(l => l.desc || l.cat || cdNum(l.qty)).map(l => ({ ...l, qty: cdNum(l.qty), price: cdNum(l.price) })),
    detail: cdGoodsMode === "detail" ? cdDetail : [],
    ct: cdNum(v("cdCt")), nw: cdNum(v("cdNw")), gw: cdNum(v("cdGw")), cbm: cdNum(v("cdCbm")), note: v("cdMkNote")
  };
}
function cdValidate(d, forSend) {
  if (forSend && !$cd("cdGroup").value.trim()) return "请填写企微群名";
  if (!d.sh.name) return "请填写发货公司";
  if (!d.co.name) return "请填写收货公司";
  if (!d.invNo) return "请填写发票号";
  if (!d.lines.length) return "请至少填写一行货物明细";
  const bad = d.lines.findIndex(l => !l.desc && !l.cat || !l.qty);
  if (bad >= 0) return `第 ${bad + 1} 行货物缺少品名或数量`;
  return "";
}
const cdFileName = d => `CI_PL_${(d.invNo || "draft").replace(/[\\/:*?"<>|\s]+/g, "_")}.xlsx`;

async function buildCiPl(d) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "YUNDA KOREA"; wb.created = new Date();
  const T = { style: "thin" };
  const KO = "맑은 고딕", CN = "SimSun";
  const numFmt = d.cur === "KRW" ? '#,##0' : '#,##0.00';
  const date = d.date ? new Date(d.date + "T00:00:00Z") : null;
  const sum = (arr, k) => arr.reduce((s, x) => s + (+x[k] || 0), 0);
  const totQty = sum(d.lines, "qty"), totAmt = sum(d.lines, "amt");

  const put = (ws, addr, value, font = {}, align = {}, fmt) => {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = { name: KO, size: 10, ...font };
    if (Object.keys(align).length) c.alignment = align;
    if (fmt) c.numFmt = fmt;
    return c;
  };
  const bd = (ws, r, c, side) => { const cell = ws.getCell(r, c); cell.border = { ...(cell.border || {}), [side]: T }; };
  const box = (ws, r1, c1, r2, c2) => {
    for (let c = c1; c <= c2; c++) { bd(ws, r1, c, "top"); bd(ws, r2, c, "bottom"); }
    for (let r = r1; r <= r2; r++) { bd(ws, r, c1, "left"); bd(ws, r, c2, "right"); }
  };
  const vline = (ws, r1, r2, c) => { for (let r = r1; r <= r2; r++) bd(ws, r, c, "left"); };
  const merge = (ws, rng) => { try { ws.mergeCells(rng); } catch (e) {} };
  const party = (ws, r0, title, p, isShipper) => {
    put(ws, "A" + r0, title, { bold: true });
    const rows = [["发货公司", "收货公司"], ["发货公司地址", "收货公司地址"], ["电话", "电话"], ["联系人", "联系人"]];
    const vals = [p.name, p.addr, p.tel, p.attn];
    rows.forEach((lab, i) => {
      const r = r0 + 1 + i;
      put(ws, "A" + r, lab[isShipper ? 0 : 1], { name: CN, bold: i !== 3 }, { horizontal: "left", vertical: "middle" });
      merge(ws, `C${r}:D${r}`);
      put(ws, "C" + r, vals[i] || "", i === 0 ? { bold: true, size: 11 } : { size: 10 }, { horizontal: "left", vertical: "middle", wrapText: i === 1 });
    });
    if ((p.addr || "").length > 55) ws.getRow(r0 + 2).height = 30;
  };

  /* ===== IV-COVER ===== */
  const iv = wb.addWorksheet("IV-COVER", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } }, views: [{ showGridLines: false }] });
  const hasCat = d.lines.some(l => l.cat);   // 类别单独一列时加宽 D 列（参照购买明细版样例）
  [10.8, 6, hasCat ? 16 : 40.1, hasCat ? 52 : 22, 32.9, 20.4, 12.2, 5.4, 21.3].forEach((w, i) => iv.getColumn(i + 1).width = w);
  merge(iv, "A1:I1");
  put(iv, "A1", "COMMERCIAL INVOICE", { size: 18, bold: true }, { horizontal: "center", vertical: "middle" });
  iv.getRow(1).height = 26.25;
  party(iv, 2, " Shipper/Exporter ", d.sh, true);
  put(iv, "E2", " No. & Date of invoice", { bold: true });
  merge(iv, "E3:I3"); put(iv, "E3", d.invNo, { bold: true, size: 11 }, { horizontal: "left", vertical: "middle" });
  merge(iv, "E4:I4"); put(iv, "E4", date || "", {}, { horizontal: "left" }, '"DATE : "dd/mmm/yy');
  if (d.sh.tax) { merge(iv, "E5:I5"); put(iv, "E5", "TAX ID : " + d.sh.tax, {}, { horizontal: "left" }); }
  party(iv, 7, " For account & risk of Messrs.", d.co, false);
  put(iv, "E7", " Remarks", { bold: true });
  merge(iv, "E8:I8"); put(iv, "E8", d.terms || "", { bold: true }, { horizontal: "left" });
  if (d.note) { merge(iv, "E9:I11"); put(iv, "E9", d.note, {}, { horizontal: "left", vertical: "top", wrapText: true }); }
  put(iv, "A12", " Notify party", { bold: true });
  put(iv, "A16", " Port of Loading", { bold: true }); put(iv, "C16", " Final destination", { bold: true });
  put(iv, "A17", d.pol || "", { size: 11 }, { horizontal: "left" }); put(iv, "C17", d.dest || "", { size: 11 }, { horizontal: "left" });
  put(iv, "A18", " Carrier", { bold: true }); put(iv, "C18", "Sailing on or about", { bold: true });
  merge(iv, "A19:B19"); merge(iv, "C19:D19");
  [12, 13, 14, 15].forEach(r => iv.getRow(r).height = 17.25);
  box(iv, 2, 1, 6, 4); box(iv, 2, 5, 6, 9); box(iv, 7, 1, 11, 4); box(iv, 7, 5, 19, 9);
  box(iv, 12, 1, 15, 4); box(iv, 16, 1, 17, 2); box(iv, 16, 3, 17, 4); box(iv, 18, 1, 19, 2); box(iv, 18, 3, 19, 4);
  // 表头
  put(iv, "A20", " Marks ", { bold: true, size: 9 }, { horizontal: "left" });
  put(iv, "C20", " Description of Goods", { bold: true });
  put(iv, "E20", "14. Quantity", { bold: true }, { horizontal: "right" });
  merge(iv, "F20:G20"); put(iv, "F20", "15. Unit Price", { bold: true }, { horizontal: "right" });
  merge(iv, "H20:I20"); put(iv, "H20", "16. Amount", { bold: true }, { horizontal: "right" });
  put(iv, "E21", "(EA)", { bold: true }, { horizontal: "right", vertical: "top" });
  merge(iv, "F21:G21"); put(iv, "F21", `(Unit : ${d.cur})`, { bold: true }, { horizontal: "right", vertical: "top" });
  merge(iv, "H21:I21"); put(iv, "H21", `(Unit : ${d.cur})`, { bold: true }, { horizontal: "right", vertical: "top" });
  // 明细
  const L0 = 22, nRows = Math.max(d.lines.length, 8);
  for (let i = 0; i < nRows; i++) {
    const r = L0 + i, l = d.lines[i];
    iv.getRow(r).height = 19.5;
    merge(iv, `A${r}:B${r}`); merge(iv, `F${r}:G${r}`); merge(iv, `H${r}:I${r}`);
    if (!l) continue;
    put(iv, "A" + r, l.marks || "", {}, { horizontal: "left", vertical: "middle" });
    if (l.cat) { put(iv, "C" + r, l.cat, { size: 10 }, { vertical: "middle" }); put(iv, "D" + r, l.desc, { size: 10 }, { vertical: "middle" }); }
    else { merge(iv, `C${r}:D${r}`); put(iv, "C" + r, l.desc, { size: 10 }, { vertical: "middle", wrapText: l.desc.length > 60 }); }
    put(iv, "E" + r, l.qty, {}, { horizontal: "right", vertical: "middle" }, "#,##0");
    if (l.fixed) {
      put(iv, "H" + r, l.amt, {}, { horizontal: "right", vertical: "middle" }, numFmt);
      put(iv, "F" + r, { formula: `H${r}/E${r}`, result: l.qty ? l.amt / l.qty : 0 }, {}, { horizontal: "right", vertical: "middle" }, d.cur === "KRW" ? '#,##0' : '#,##0.00');
    } else {
      put(iv, "F" + r, l.price, {}, { horizontal: "right", vertical: "middle" }, numFmt);
      put(iv, "H" + r, { formula: `E${r}*F${r}`, result: l.amt }, {}, { horizontal: "right", vertical: "middle" }, numFmt);
    }
  }
  const LT = L0 + nRows;
  iv.getRow(LT).height = 21;
  put(iv, "C" + LT, "TOTAL", { bold: true, size: 11 }, { vertical: "middle" });
  put(iv, "E" + LT, { formula: `SUM(E${L0}:E${LT - 1})`, result: totQty }, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, "#,##0");
  merge(iv, `H${LT}:I${LT}`);
  put(iv, "H" + LT, { formula: `SUM(H${L0}:H${LT - 1})`, result: totAmt }, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, numFmt);
  box(iv, 20, 1, 21, 9);
  [3, 5, 6, 8].forEach(c => vline(iv, 20, LT, c));
  box(iv, L0, 1, LT, 9);
  for (let c = 1; c <= 9; c++) bd(iv, LT, c, "top");
  const IS = LT + 3;
  put(iv, "F" + IS, "Signed by", { size: 11 });
  for (let c = 6; c <= 9; c++) bd(iv, IS + 2, c, "bottom");
  merge(iv, `F${IS + 3}:I${IS + 3}`); put(iv, "F" + (IS + 3), d.sh.name, { bold: true }, { horizontal: "center" });
  box(iv, LT + 1, 1, IS + 4, 9);
  iv.pageSetup.printArea = `A1:I${IS + 4}`;

  /* ===== PK-COVER ===== */
  const pk = wb.addWorksheet("PK-COVER", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } }, views: [{ showGridLines: false }] });
  [5.9, 11.9, hasCat ? 16 : 39.6, hasCat ? 54 : 19.1, 13, 14.5, 15.5, 15.5].forEach((w, i) => pk.getColumn(i + 1).width = w);
  merge(pk, "A1:H1");
  put(pk, "A1", "PACKING LIST", { size: 18, bold: true }, { horizontal: "center", vertical: "middle" });
  pk.getRow(1).height = 26.25;
  party(pk, 2, " Shipper/Exporter ", d.sh, true);
  put(pk, "E2", " 8. No. & Date of invoice", { bold: true });
  merge(pk, "E3:H3"); put(pk, "E3", d.invNo, { bold: true, size: 11 }, { horizontal: "left", vertical: "middle" });
  merge(pk, "E4:H4"); put(pk, "E4", date || "", {}, { horizontal: "left" }, '"DATE : "dd/mmm/yy');
  if (d.sh.tax) { merge(pk, "E5:H5"); put(pk, "E5", "TAX ID : " + d.sh.tax, {}, { horizontal: "left" }); }
  party(pk, 7, " For account & risk of Messrs.", d.co, false);
  put(pk, "E7", " 9. Remarks", { bold: true });
  merge(pk, "E8:H8"); put(pk, "E8", d.terms || "", { bold: true }, { horizontal: "left" });
  if (d.note) { merge(pk, "E9:H11"); put(pk, "E9", d.note, {}, { horizontal: "left", vertical: "top", wrapText: true }); }
  put(pk, "A12", " Notify party", { bold: true });
  put(pk, "A17", "4. Port of Loading", { bold: true }); put(pk, "C17", "5. Final destination", { bold: true });
  put(pk, "A18", d.pol || "", { size: 11 }, { horizontal: "left" }); put(pk, "C18", d.dest || "", { size: 11 }, { horizontal: "left" });
  put(pk, "A19", "6. Carrier", { bold: true }); put(pk, "C19", "7. Sailing on or about", { bold: true });
  merge(pk, "A20:B20"); merge(pk, "C20:D20");
  box(pk, 2, 1, 6, 4); box(pk, 2, 5, 6, 8); box(pk, 7, 1, 11, 4); box(pk, 7, 5, 20, 8);
  box(pk, 12, 1, 16, 4); box(pk, 17, 1, 18, 2); box(pk, 17, 3, 18, 4); box(pk, 19, 1, 20, 2); box(pk, 19, 3, 20, 4);
  put(pk, "A21", "10. Marks &", { bold: true, size: 9 }, { horizontal: "left" });
  put(pk, "A22", "     No. of PKGS", { bold: true, size: 9 }, { horizontal: "left" });
  put(pk, "C21", "11. Description of Goods", { bold: true });
  put(pk, "E21", "12. Quantity", { bold: true }, { horizontal: "right" });
  put(pk, "F21", "13. Net-weight", { bold: true }, { horizontal: "right" });
  put(pk, "G21", "14.Gross-weight", { bold: true }, { horizontal: "right" });
  put(pk, "H21", "15.Measurement", { bold: true }, { horizontal: "right" });
  put(pk, "E22", "(EA)", { bold: true }, { horizontal: "right", vertical: "top" });
  put(pk, "F22", "(KGS)", { bold: true }, { horizontal: "right", vertical: "top" });
  put(pk, "G22", "(KGS)", { bold: true }, { horizontal: "right", vertical: "top" });
  put(pk, "H22", "(CBM)", { bold: true }, { horizontal: "right", vertical: "top" });
  const P0 = 23, single = d.lines.length === 1;
  const kgFmt = n => (Number.isInteger(n) ? '#,##0' : '#,##0.00') + '"KGS"';
  for (let i = 0; i < nRows; i++) {
    const r = P0 + i, l = d.lines[i];
    pk.getRow(r).height = 19.5;
    merge(pk, `A${r}:B${r}`);
    if (!l) continue;
    put(pk, "A" + r, l.marks || "", {}, { horizontal: "left", vertical: "middle" });
    if (l.cat) { put(pk, "C" + r, l.cat, {}, { vertical: "middle" }); put(pk, "D" + r, l.desc, {}, { vertical: "middle" }); }
    else { merge(pk, `C${r}:D${r}`); put(pk, "C" + r, l.desc, {}, { vertical: "middle", wrapText: l.desc.length > 60 }); }
    put(pk, "E" + r, l.qty, {}, { horizontal: "right", vertical: "middle" }, "#,##0");
    if (single) {
      if (d.nw) put(pk, "F" + r, d.nw, {}, { horizontal: "right", vertical: "middle" }, kgFmt(d.nw));
      if (d.gw) put(pk, "G" + r, d.gw, {}, { horizontal: "right", vertical: "middle" }, kgFmt(d.gw));
      if (d.cbm) put(pk, "H" + r, d.cbm, {}, { horizontal: "right", vertical: "middle" }, "0.000");
    }
  }
  const PT = P0 + nRows;
  pk.getRow(PT).height = 21;
  put(pk, "C" + PT, "TOTAL", { bold: true, size: 11 }, { vertical: "middle" });
  put(pk, "E" + PT, d.ct ? `${d.ct}CT` : { formula: `SUM(E${P0}:E${PT - 1})`, result: totQty }, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, d.ct ? undefined : "#,##0");
  if (d.nw) put(pk, "F" + PT, d.nw, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, kgFmt(d.nw));
  if (d.gw) put(pk, "G" + PT, d.gw, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, kgFmt(d.gw));
  if (d.cbm) put(pk, "H" + PT, d.cbm, { bold: true, size: 11 }, { horizontal: "right", vertical: "middle" }, "0.000");
  box(pk, 21, 1, 22, 8);
  [3, 5, 6, 7, 8].forEach(c => vline(pk, 21, PT, c));
  box(pk, P0, 1, PT, 8);
  for (let c = 1; c <= 8; c++) bd(pk, PT, c, "top");
  const PS = PT + 3;
  put(pk, "E" + PS, "Signed by", { size: 11 });
  for (let c = 5; c <= 8; c++) bd(pk, PS + 2, c, "bottom");
  merge(pk, `E${PS + 3}:H${PS + 3}`); put(pk, "E" + (PS + 3), d.sh.name, { bold: true }, { horizontal: "center" });
  box(pk, PT + 1, 1, PS + 4, 8);
  pk.pageSetup.printArea = `A1:H${PS + 4}`;

  /* ===== Sheet1 购买明细 ===== */
  if (d.detail && d.detail.length) {
    const sh = wb.addWorksheet("Sheet1");
    const DT = "돋움";
    [8.89, 17.22, 20, 11.67, 14.44, 12.56, 7.67, 12.33, 14.56, 37.33, 12.56, 17.56, 17.56].forEach((w, i) => sh.getColumn(i + 1).width = w);
    const n = d.detail.length, last = 2 + n;
    sh.mergeCells("A1:E1");
    const f1 = { name: DT, size: 11 };
    const c1 = sh.getCell("A1"); c1.value = `직수출 수출면장 신고일자:${d.date || ""}`; c1.font = f1;
    const tot = k => d.detail.reduce((s, o) => s + (+o[k] || 0), 0);
    const payT = tot("pay"), declT = d.detail.reduce((s, o) => s + Math.round(o.pay * 0.945 / 10000) * 10000, 0);
    [["F", payT], ["K", payT], ["L", payT / 11 * 10], ["M", declT]].forEach(([col, v]) => {
      const c = sh.getCell(col + "1"); c.value = { formula: `SUM(${col}3:${col}${last})`, result: v }; c.font = f1; c.numFmt = "#,##0_ ";
    });
    const hdr = ["NO.", "매입담당", "가맹점명", "매입일자", "승인번호", "결제액", "원산지", "제품구분", "상품브랜드", "상품명", "단가", "공급가액\n(VAT제외)", "수출신고액(94.5%)"];
    hdr.forEach((h, i) => { const c = sh.getCell(2, i + 1); c.value = h; c.font = { name: DT, size: 14, bold: true }; c.alignment = { wrapText: i >= 11, horizontal: i === 3 ? "center" : i === 4 ? "right" : undefined }; });
    sh.getRow(2).height = 36;
    d.detail.forEach((o, i) => {
      const r = 3 + i, row = sh.getRow(r);
      const dm = String(o.date || "").match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      const vals = [cdNum(o.no) || i + 1, o.buyer || "", o.store || "", dm ? new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3])) : (o.date || ""), o.appr || "", o.pay, o.origin || "", o.cat || "", o.brand || "", o.name || "",
        { formula: `F${r}`, result: o.pay }, { formula: `K${r}/11*10`, result: o.pay / 11 * 10 }, { formula: `ROUND(K${r}*94.5%,-4)`, result: Math.round(o.pay * 0.945 / 10000) * 10000 }];
      vals.forEach((v, j) => {
        const c = row.getCell(j + 1); c.value = v; c.font = { name: DT, size: 11 };
        if (j === 3) { c.numFmt = "yyyy/m/d;@"; c.alignment = { horizontal: "center" }; }
        if (j === 4) c.alignment = { horizontal: "right" };
        if (j === 5 || j >= 10) c.numFmt = "#,##0_ ";
      });
    });
  }
  return wb.xlsx.writeBuffer();
}

function cdKoConfirm(d) {
  const ko = d.lines.map((l, i) => (HAS_KO.test(l.desc) || HAS_KO.test(l.cat)) ? i + 1 : 0).filter(Boolean);
  return !ko.length || confirm(`第 ${ko.join("、")} 行品名仍含韩文，报关单需英文品名。\n确定仍要继续吗？`);
}
let cdLastUrl = null;
function cdBlobUrl(buf) {
  if (cdLastUrl) URL.revokeObjectURL(cdLastUrl);
  cdLastUrl = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  return cdLastUrl;
}
function cdSave(buf, name) {
  const a = document.createElement("a"); a.href = cdBlobUrl(buf); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
$cd("cdDownload").addEventListener("click", async () => {
  const d = cdCollect(), err = cdValidate(d, false);
  if (err) return cdStatus("cdMkStatus", err, "err");
  if (!cdKoConfirm(d)) return;
  try { const buf = await buildCiPl(d); cdSave(buf, cdFileName(d)); cdStatus("cdMkStatus", `已生成 ${cdFileName(d)} ✓`, "ok"); }
  catch (e) { cdStatus("cdMkStatus", e.message || "生成失败", "err"); }
});
$cd("cdMkSend").addEventListener("click", async () => {
  const d = cdCollect(), err = cdValidate(d, true), btn = $cd("cdMkSend");
  if (err) return cdStatus("cdMkStatus", err, "err");
  if (!cdKoConfirm(d)) return;
  btn.disabled = true; cdStatus("cdMkStatus", "生成并发送中…");
  try {
    const buf = await buildCiPl(d), name = cdFileName(d);
    if (buf.byteLength > CD_MAX) throw new Error("文件超过 20MB");
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
    fd.append("filename", name); fd.append("group", $cd("cdGroup").value.trim());
    fd.append("kind", d.detail.length ? "表格制作（CI + PL + 购买明细）" : "表格制作（CI + PL）");
    fd.append("invoice", d.invNo); fd.append("dest", cdDestText());
    const totQ = d.lines.reduce((s, l) => s + l.qty, 0), totA = d.lines.reduce((s, l) => s + l.amt, 0);
    fd.append("summary", `${d.sh.name} → ${d.co.name} · ${d.lines.length} 项 / ${totQ} EA / ${d.cur} ${cdFmt(totA)}` +
      (d.ct ? ` · ${d.ct}CT` : "") + (d.gw ? ` · GW ${d.gw}kg` : "") + (d.cbm ? ` · ${d.cbm} CBM` : ""));
    fd.append("note", d.note); fd.append("hp", $cd("bkHp").value);
    await cdPost(fd);
    cdStatus("cdMkStatus", `已发送到企微群 ✓ <a href="${cdBlobUrl(buf)}" download="${cdEsc(name)}">下载副本 ${cdEsc(name)}</a>`, "ok");
  } catch (e) { cdStatus("cdMkStatus", (e.message || "发送失败") + "，请稍后再试", "err"); }
  btn.disabled = false;
});

cdLines = [cdBlank()];
cdRender();
