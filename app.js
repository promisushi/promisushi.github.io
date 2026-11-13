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
  $modal.hidden = false;
}

function calcFees() {
  const value = num("inValue");
  const weight = num("inWeight");
  const volume = num("inVolume");

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
$modal.addEventListener("click", e => { if (e.target === $modal) $modal.hidden = true; });
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
