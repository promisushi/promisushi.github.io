/* ============================================================
 * 仁川国际机场航线数据 ICN ROUTE DATABASE
 * 数据来源：仁川机场官网/公开航线资料整理（截至 2026-11）
 * 注意：航线与航司信息会随航季调整，正式对外使用前请以
 *       仁川机场官网 airport.go.kr 最新公告核对。
 *
 * 费用扩展预留：每条航线对象可挂 internalFee 字段（内部费用），
 * 当前版本不展示、不计算；后续版本填入即可直接接入报价模块。
 * ============================================================ */

const AIRLINES = {
  // —— 客运航司 ——
  KE:  { name: "大韩航空",       en: "Korean Air",        code: "KE" },
  OZ:  { name: "韩亚航空",       en: "Asiana Airlines",   code: "OZ" },
  "7C":{ name: "济州航空",       en: "Jeju Air",          code: "7C" },
  ZE:  { name: "易斯达航空",     en: "Eastar Jet",        code: "ZE" },
  TW:  { name: "德威航空",       en: "T'way Air",         code: "TW" },
  LJ:  { name: "真航空",         en: "Jin Air",           code: "LJ" },
  "MM":{ name: "乐桃航空",       en: "Peach Aviation",    code: "MM" },
  JL:  { name: "日本航空",       en: "Japan Airlines",    code: "JL" },
  NH:  { name: "全日空",         en: "ANA",               code: "NH" },
  CX:  { name: "国泰航空",       en: "Cathay Pacific",    code: "CX" },
  HX:  { name: "香港航空",       en: "Hong Kong Airlines",code: "HX" },
  UO:  { name: "香港快运",       en: "HK Express",        code: "UO" },
  NX:  { name: "澳门航空",       en: "Air Macau",         code: "NX" },
  CI:  { name: "中华航空",       en: "China Airlines",    code: "CI" },
  AE:  { name: "华信航空",       en: "Mandarin Airlines", code: "AE" },
  BR:  { name: "长荣航空",       en: "EVA Air",           code: "BR" },
  CA:  { name: "中国国际航空",   en: "Air China",         code: "CA" },
  CZ:  { name: "中国南方航空",   en: "China Southern",    code: "CZ" },
  MU:  { name: "中国东方航空",   en: "China Eastern",     code: "MU" },
  ZH:  { name: "深圳航空",       en: "Shenzhen Airlines", code: "ZH" },
  SC:  { name: "山东航空",       en: "Shandong Airlines", code: "SC" },
  "3U":{ name: "四川航空",       en: "Sichuan Airlines",  code: "3U" },
  HO:  { name: "吉祥航空",       en: "Juneyao Air",       code: "HO" },
  HU:  { name: "海南航空",       en: "Hainan Airlines",   code: "HU" },
  JD:  { name: "首都航空",       en: "Capital Airlines",  code: "JD" },
  GJ:  { name: "长龙航空",       en: "Loong Air",         code: "GJ" },
  PN:  { name: "西部航空",       en: "West Air",          code: "PN" },
  VJ:  { name: "越捷航空",       en: "VietJet Air",       code: "VJ" },
  VN:  { name: "越南航空",       en: "Vietnam Airlines",  code: "VN" },
  PR:  { name: "菲律宾航空",     en: "Philippine Airlines",code: "PR" },
  GA:  { name: "鹰航（印尼）",   en: "Garuda Indonesia",  code: "GA" },
  MH:  { name: "马来西亚航空",   en: "Malaysia Airlines", code: "MH" },
  SQ:  { name: "新加坡航空",     en: "Singapore Airlines",code: "SQ" },
  TR:  { name: "酷航",           en: "Scoot",             code: "TR" },
  QZ:  { name: "印尼鹰航联运",   en: "Indonesia AirAsia", code: "QZ" },
  D7:  { name: "亚洲航空X",      en: "AirAsia X",         code: "D7" },
  AM:  { name: "墨西哥航空",     en: "Aeroméxico",        code: "AM" },
  VJparata: { name: "Parata Air", en: "Parata Air",       code: "PA" },
  // —— 货运航司 ——
  CZc: { name: "中国南方航空货运", en: "China Southern Cargo", code: "CZ" },
  KEc: { name: "大韩航空货运",       en: "Korean Air Cargo",        code: "KE Cargo" },
  OZc: { name: "韩亚航空货运",       en: "Asiana Cargo",            code: "OZ Cargo" },
  KJ:  { name: "仁川航空",           en: "Air Incheon",             code: "KJ" },
  QW:  { name: "青岛航空",           en: "Qingdao Airlines",        code: "QW" },
  YP:  { name: "普莱米亚航空",       en: "Air Premia",              code: "YP" },
  KZ:  { name: "日本货物航空",       en: "Nippon Cargo Airlines",   code: "KZ" },
  NHc: { name: "全日空货运",         en: "ANA Cargo",               code: "NH Cargo" },
  CAc: { name: "中国国际货运航空",   en: "Air China Cargo",         code: "CA Cargo" },
  CK:  { name: "中国货运航空",       en: "China Cargo Airlines",    code: "CK" },
  CF:  { name: "中国邮政航空",       en: "China Postal Airlines",   code: "CF" },
  SF:  { name: "顺丰航空",           en: "SF Airlines",             code: "O3" },  // IATA 二字码为 O3（2026-11-13 更正）
  BK:  { name: "奥凯航空货运",       en: "Okay Airways Cargo",      code: "BK" },
  Y8:  { name: "金鹏航空",           en: "Suparna Airlines",        code: "Y8" },
  CXc: { name: "国泰货运",           en: "Cathay Cargo",            code: "CX Cargo" },
  HXc: { name: "香港航空货运",       en: "Hong Kong Air Cargo",     code: "HX Cargo" },
  FX:  { name: "联邦快递",           en: "FedEx Express",           code: "FX" },
  "5X":{ name: "UPS 航空",           en: "UPS Airlines",            code: "5X" },
  PO:  { name: "极地货运航空",       en: "Polar Air Cargo",         code: "PO" },
  "5Y":{ name: "亚特拉斯航空",       en: "Atlas Air",               code: "5Y" },
  DP:  { name: "DHL 航空",           en: "DHL Aviation",            code: "DHL" },
  "7Ccargo": { name: "济州航空货运", en: "Jeju Air Cargo",          code: "7C Cargo" },
  N5:  { name: "西部环球航空",       en: "Western Global",          code: "N5" },
  CV:  { name: "卢森堡货运",         en: "Cargolux",                code: "CV" },
  EKc: { name: "阿联酋货运航空",     en: "Emirates SkyCargo",       code: "EK Cargo" },
  GG:  { name: "天空租赁货运",       en: "Sky Lease Cargo",         code: "GG" },
};

/* 区域与国家定义 */
const REGIONS = [
  { id: "cn", name: "中国",   en: "CHINA" },
  { id: "jp", name: "日本",   en: "JAPAN" },
  { id: "sea",name: "东南亚", en: "SOUTHEAST ASIA" },
  { id: "am", name: "美洲",   en: "AMERICAS" },
];

/* 目的地航线数据库
 * pax: 客运航司 key 数组 | cgo: 货运航司 key 数组
 * internalFee: 预留字段（当前版本 null，不参与展示与计算） */
const DESTINATIONS = [
  /* ============ 中国 ============ */
  { code:"PEK", city:"北京",   cityEn:"Beijing",   region:"cn", pax:["KE","OZ","CA"], cgo:["KEc","CAc","FX"] , sub:"hb" },
  { code:"PKX", city:"北京大兴",cityEn:"Beijing Daxing",region:"cn", pax:["CZ"], cgo:[ "CZc" ] , sub:"hb" },
  { code:"PVG", city:"上海",   cityEn:"Shanghai",  region:"cn", pax:["KE","OZ","CA","MU","CZ"], cgo:["KEc","OZc","CAc","CK","Y8","FX","5X","PO","5Y","KZ", "CZc"] , sub:"hd" },
  { code:"TSN", city:"天津",   cityEn:"Tianjin",   region:"cn", pax:["KE","OZ","CA"], cgo:["OZc","BK"] , sub:"hb" },
  { code:"CAN", city:"广州",   cityEn:"Guangzhou", region:"cn", pax:["KE","OZ"], cgo:["KEc","OZc","FX", "CZc"] , sub:"hn" },
  { code:"SZX", city:"深圳",   cityEn:"Shenzhen",  region:"cn", pax:["KE","OZ","CZ","ZH"], cgo:["SF","FX","5X","PO","5Y", "CZc"] , sub:"hn" },
  { code:"TAO", city:"青岛",   cityEn:"Qingdao",   region:"cn", pax:["KE","OZ","CA","SC"], cgo:["KEc","KJ","5X","Y8","MU","CZc","QW"] , sub:"hd" },
  { code:"DLC", city:"大连",   cityEn:"Dalian",    region:"cn", pax:["KE","OZ","CZ"], cgo:[ "CZc" ] , sub:"db" },
  { code:"SHE", city:"沈阳",   cityEn:"Shenyang",  region:"cn", pax:["KE"], cgo:[ "CZc" ] , sub:"db" },
  { code:"CGQ", city:"长春",   cityEn:"Changchun", region:"cn", pax:["OZ","CZ"], cgo:[ "CZc" ] , sub:"db" },
  { code:"HRB", city:"哈尔滨", cityEn:"Harbin",    region:"cn", pax:["OZ"], cgo:[ "CZc" ] , sub:"db" },
  { code:"YNJ", city:"延吉",   cityEn:"Yanji",     region:"cn", pax:["KE","OZ","7C"], cgo:[ "CZc" ] , sub:"db" },
  { code:"MDG", city:"牡丹江", cityEn:"Mudanjiang",region:"cn", pax:["KE","OZ"], cgo:[] , sub:"db" },
  { code:"XIY", city:"西安",   cityEn:"Xi'an",     region:"cn", pax:["KE","OZ"], cgo:["KEc","CF","CZc"] , sub:"xb" },
  { code:"CGO", city:"郑州",   cityEn:"Zhengzhou", region:"cn", pax:["KE"], cgo:["KEc","SF","5X","FX", "CZc"] , sub:"hz" },
  { code:"WUH", city:"武汉",   cityEn:"Wuhan",     region:"cn", pax:["KE"], cgo:[ "CZc" ] , sub:"hz" },
  { code:"CSX", city:"长沙",   cityEn:"Changsha",  region:"cn", pax:["KE","OZ"], cgo:["5Y", "CZc"] , sub:"hz" },
  { code:"KMG", city:"昆明",   cityEn:"Kunming",   region:"cn", pax:["KE"], cgo:[] , sub:"xn" },
  { code:"SYX", city:"三亚",   cityEn:"Sanya",     region:"cn", pax:["KE","LJ","JD"], cgo:[] , sub:"hn" },
  { code:"XMN", city:"厦门",   cityEn:"Xiamen",    region:"cn", pax:["KE"], cgo:["KEc","5Y"] , sub:"hd" },
  { code:"TNA", city:"济南",   cityEn:"Jinan",     region:"cn", pax:["KE"], cgo:["KJ","SF"] , sub:"hd" },
  { code:"WEH", city:"威海",   cityEn:"Weihai",    region:"cn", pax:["KE","OZ","7C"], cgo:[] , sub:"hd" },
  { code:"YNT", city:"烟台",   cityEn:"Yantai",    region:"cn", pax:["KE","OZ","LJ"], cgo:["OZc","CF","KJ","7Ccargo", "CZc"] , sub:"hd" },
  { code:"NKG", city:"南京",   cityEn:"Nanjing",   region:"cn", pax:["OZ"], cgo:[] , sub:"hd" },
  { code:"HGH", city:"杭州",   cityEn:"Hangzhou",  region:"cn", pax:["OZ","CA"], cgo:["Y8","5Y"] , sub:"hd" },
  { code:"YNZ", city:"盐城",   cityEn:"Yancheng",  region:"cn", pax:["OZ"], cgo:[] , sub:"hd" },
  { code:"KWL", city:"桂林",   cityEn:"Guilin",    region:"cn", pax:["OZ","7C"], cgo:[] , sub:"hn" },
  { code:"TFU", city:"成都",   cityEn:"Chengdu",   region:"cn", pax:["OZ","CA","3U"], cgo:["OZc","5Y"] , sub:"xn" },
  { code:"CKG", city:"重庆",   cityEn:"Chongqing", region:"cn", pax:["OZ"], cgo:["OZc","5Y"] , sub:"xn" },
  { code:"KWE", city:"贵阳",   cityEn:"Guiyang",   region:"cn", pax:["CA"], cgo:[] , sub:"xn" },
  { code:"HAK", city:"海口",   cityEn:"Haikou",    region:"cn", pax:["HU"], cgo:[] , sub:"hn" },
  { code:"TYN", city:"太原",   cityEn:"Taiyuan",   region:"cn", pax:["HO"], cgo:[] , sub:"hb" },
  { code:"NNG", city:"南宁",   cityEn:"Nanning",   region:"cn", pax:["LJ"], cgo:[] , sub:"hn" },
  { code:"INC", city:"银川",   cityEn:"Yinchuan",  region:"cn", pax:["LJ"], cgo:[] , sub:"xb" },
  { code:"DYX", city:"张家界", cityEn:"Zhangjiajie",region:"cn", pax:["3U"], cgo:[] , sub:"hz" },
  { code:"HKG", city:"香港",   cityEn:"Hong Kong", region:"cn", pax:["KE","OZ","CX","HX","UO","7C","TW"], cgo:["KEc","OZc","CXc","HXc","FX","5X","DP","PO", "CZc", "KJ", "YP", "7C", "TW"] , sub:"gat" },
  { code:"MFM", city:"澳门",   cityEn:"Macau",     region:"cn", pax:["NX","LJ","KE"], cgo:[ "CZc" ] , sub:"gat" },

  /* ============ 日本 ============ */
  { code:"NRT", city:"东京成田", cityEn:"Tokyo Narita", region:"jp", pax:["KE","OZ","JL","NH","ZE","VJparata"], cgo:["KEc","OZc","KZ","NHc","FX","PO","5Y","7Ccargo","LJ"] , sub:"hs" },
  { code:"HND", city:"东京羽田", cityEn:"Tokyo Haneda", region:"jp", pax:["KE","OZ","MM"], cgo:["KJ"] , sub:"hs" },
  { code:"KIX", city:"大阪关西", cityEn:"Osaka Kansai", region:"jp", pax:["KE","OZ","7C","MM","NH","VJparata"], cgo:["KEc","OZc","KZ","NHc","CXc","EKc"] , sub:"hs" },
  { code:"NGO", city:"名古屋",   cityEn:"Nagoya",       region:"jp", pax:["KE","OZ","NH"], cgo:["OZc","PO"] , sub:"hs" },
  { code:"CTS", city:"札幌",     cityEn:"Sapporo",      region:"jp", pax:["KE","OZ","ZE","TW","LJ"], cgo:[] , sub:"hkd" },
  { code:"FUK", city:"福冈",     cityEn:"Fukuoka",      region:"jp", pax:["KE","OZ"], cgo:[] , sub:"ky" },
  { code:"OKA", city:"冲绳",     cityEn:"Okinawa",      region:"jp", pax:["OZ"], cgo:["NHc"] , sub:"ky" },
  { code:"SDJ", city:"仙台",     cityEn:"Sendai",       region:"jp", pax:["OZ"], cgo:[] , sub:"hs" },
  { code:"HIJ", city:"广岛",     cityEn:"Hiroshima",    region:"jp", pax:["OZ"], cgo:[] , sub:"hs" },
  { code:"TAK", city:"高松",     cityEn:"Takamatsu",    region:"jp", pax:["OZ"], cgo:[] , sub:"sk" },
  { code:"MYJ", city:"松山",     cityEn:"Matsuyama",    region:"jp", pax:["OZ"], cgo:[] , sub:"sk" },
  { code:"KMJ", city:"熊本",     cityEn:"Kumamoto",     region:"jp", pax:["OZ"], cgo:[] , sub:"ky" },
  { code:"KMI", city:"宫崎",     cityEn:"Miyazaki",     region:"jp", pax:["OZ"], cgo:[] , sub:"ky" },
  { code:"NGS", city:"长崎",     cityEn:"Nagasaki",     region:"jp", pax:["KE"], cgo:[] , sub:"ky" },
  { code:"KMQ", city:"小松",     cityEn:"Komatsu",      region:"jp", pax:["KE"], cgo:[] , sub:"hs" },
  { code:"OKJ", city:"冈山",     cityEn:"Okayama",      region:"jp", pax:["KE"], cgo:[] , sub:"hs" },
  { code:"KIJ", city:"新潟",     cityEn:"Niigata",      region:"jp", pax:["KE"], cgo:[] , sub:"hs" },
  { code:"AXT", city:"秋田",     cityEn:"Akita",        region:"jp", pax:["KE"], cgo:[] , sub:"hs" },
  { code:"AOJ", city:"青森",     cityEn:"Aomori",       region:"jp", pax:["KE"], cgo:[] , sub:"hs" },
  { code:"KOJ", city:"鹿儿岛",   cityEn:"Kagoshima",    region:"jp", pax:["KE"], cgo:[] , sub:"ky" },
  { code:"OIT", city:"大分",     cityEn:"Oita",         region:"jp", pax:["KE"], cgo:[] , sub:"ky" },
  { code:"HKD", city:"函馆",     cityEn:"Hakodate",     region:"jp", pax:["KE"], cgo:[] , sub:"hkd" },
  { code:"KKJ", city:"北九州",   cityEn:"Kitakyushu",   region:"jp", pax:["7C"], cgo:["KEc"] , sub:"ky" },

  /* ============ 东南亚 ============ */
  { code:"BKK", city:"曼谷",     cityEn:"Bangkok",        region:"sea", pax:["KE","OZ","7C","TW","LJ"], cgo:["KEc","OZc", "CZc"] },
  { code:"HKT", city:"普吉",     cityEn:"Phuket",         region:"sea", pax:["OZ"], cgo:[ "CZc" ] },
  { code:"SIN", city:"新加坡",   cityEn:"Singapore",      region:"sea", pax:["KE","OZ","SQ","CI"], cgo:["KEc","OZc","DP","PO","5Y", "CZc", "KJ", "SQ", "CI"] },
  { code:"KUL", city:"吉隆坡",   cityEn:"Kuala Lumpur",   region:"sea", pax:["KE","MH","D7"], cgo:["KEc", "CZc", "D7"] },
  { code:"PEN", city:"槟城",     cityEn:"Penang",         region:"sea", pax:["KE"], cgo:["KEc", "CZc"] },
  { code:"BKI", city:"亚庇",     cityEn:"Kota Kinabalu",  region:"sea", pax:["KE","OZ","ZE"], cgo:[ "CZc" ] },
  { code:"HAN", city:"河内",     cityEn:"Hanoi",          region:"sea", pax:["KE","OZ","VJ"], cgo:["KEc","OZc","KJ","7Ccargo", "CZc"] },
  { code:"SGN", city:"胡志明市", cityEn:"Ho Chi Minh City",region:"sea", pax:["KE","OZ","VJ"], cgo:["KEc","OZc","VJ", "CZc"] },
  { code:"DAD", city:"岘港",     cityEn:"Da Nang",        region:"sea", pax:["KE","VJ","VJparata"], cgo:[] },
  { code:"CXR", city:"芽庄",     cityEn:"Nha Trang",      region:"sea", pax:["VJ","VJparata"], cgo:[ "CZc" ] },
  { code:"PQC", city:"富国岛",   cityEn:"Phu Quoc",       region:"sea", pax:["VJparata"], cgo:[] },
  { code:"MNL", city:"马尼拉",   cityEn:"Manila",         region:"sea", pax:["KE","OZ","7C","PR"], cgo:["KEc","OZc","FX", "CZc"] },
  { code:"CEB", city:"宿雾",     cityEn:"Cebu",           region:"sea", pax:["KE","7C","LJ"], cgo:[ "CZc" ] },
  { code:"CRK", city:"克拉克",   cityEn:"Clark",          region:"sea", pax:["OZ","LJ"], cgo:[] },
  { code:"KLO", city:"卡利博（长滩岛）", cityEn:"Kalibo", region:"sea", pax:["LJ"], cgo:[] },
  { code:"CGK", city:"雅加达",   cityEn:"Jakarta",        region:"sea", pax:["KE","GA"], cgo:["KEc","5Y", "CZc"] },
  { code:"DPS", city:"巴厘岛",   cityEn:"Denpasar (Bali)",region:"sea", pax:["KE"], cgo:[ "CZc" ] },
  { code:"PNH", city:"金边",     cityEn:"Phnom Penh",     region:"sea", pax:["OZ"], cgo:[ "CZc" ] },
  { code:"REP", city:"暹粒",     cityEn:"Siem Reap",      region:"sea", pax:["OZ","ZE"], cgo:[ "CZc" ] },
  { code:"VTE", city:"万象",     cityEn:"Vientiane",      region:"sea", pax:["LJ"], cgo:[ "CZc" ] },
  { code:"RGN", city:"仰光",     cityEn:"Yangon",         region:"sea", pax:["KE"], cgo:[ "CZc" ] },

  /* ============ 美洲（北美 / 中南美）============ */
  { code:"MEX", city:"墨西哥城", cityEn:"Mexico City",    region:"am", pax:["AM"], cgo:["AM"] },
];

/* 数据同步时间（每次数据更新后修改此字段，界面会显示） */
const DATA_UPDATED = "2026-11-11";

/* 航班类型定义 */
const TYPES = {
  pax: { key: "pax", name: "客运", en: "PASSENGER", color: "#ffd800" },
  cgo: { key: "cgo", name: "货运", en: "CARGO",     color: "#4db8ff" },
};

/* ============================================================
 * 空运费率表 AIR FREIGHT RATES（多航司）
 * 单位：KRW/kg；m = 最低收费（KRW/票）
 * 段位：n(<45K) / w45 / w100 / w300 / w500 / w1000
 * 附加费：
 *   fsc     燃油附加（KRW/kg），0 = 无
 *   cgc     地勤附加（固定金额数组，按票计）
 *   allIn   true = ALL-IN，不再另计 FSC/CGC
 *   noMarkup true = 表内已是对外售价，不再乘系数（如 O3236）
 * 目的地行内可覆盖航司级字段（同一航司不同航线报价不同时使用）：
 *   label / effective / fsc / cgc / allIn / noMarkup / carrierNote（替换航司级 note）
 *   transfer true = 转机（界面显示「转机」角标），via = 中转站代码
 *   note    本航线备注（追加显示）
 * 说明：原表未列出的段位此处已按上一段延用，并在 note 中标注
 * ⚠ 国际价格随时变动，仅作参考
 * ============================================================ */
const AIR_FREIGHT_RATES = {
  currency: "KRW",
  updated: "2026-11-13",
  disclaimer: "国际价格变动，仅作参考",

  /* 客运航班（腹舱）沿用同公司货运表的别名 */
  alias: { CZ: "CZc", KE: "KEc", OZ: "OZc" },

  carriers: {
    /* ===== 中国南方航空 CZ ===== */
    CZc: {
      code: "CZ",
      label: "CZ RATE／2026 · Golden Phoenix",
      effective: "2026-10-18 ~ U.F.N.",
      fsc: 0,
      note: "FSC 없음（运价已含燃油）",
      rates: {
        /* —— 中国（第1页可确认行）—— */
        CGQ: { m: 42500, n: 4320, w45: 1200, w100: 650,  w300: 650,  w500: 650,  w1000: 650 },
        HRB: { m: 42500, n: 5390, w45: 2400, w100: 2000, w300: 1550, w500: 1500, w1000: 1500 },
        PKX: { m: 42500, n: 5050, w45: 1200, w100: 700,  w300: 600,  w500: 600,  w1000: 600 },
        WUH: { m: 42500, n: 5790, w45: 2200, w100: 2000, w300: 1600, w500: 1360, w1000: 1360 },
        YNT: { m: 42500, n: 3580, w45: 1400, w100: 1300, w300: 1000, w500: 900,  w1000: 900 },
        YNJ: { m: 42500, n: 6670, w45: 2400, w100: 2000, w300: 1600, w500: 1500, w1000: 1500 },
        /* —— 港澳 —— */
        HKG: { m: 27930, n: 1880, w45: 1600, w100: 1400, w300: 1200, w500: 1000, w1000: 800 },
        MFM: { m: 27930, n: 1880, w45: 1600, w100: 1400, w300: 1200, w500: 1000, w1000: 800 },
        /* —— 东南亚 —— */
        BKK: { m: 55820, n: 2710, w45: 2300, w100: 2100, w300: 1900, w500: 1700, w1000: 1500 },
        HKT: { m: 55820, n: 2120, w45: 1800, w100: 1600, w300: 1400, w500: 1200, w1000: 1000 },
        /* SIN / KUL：2026-11-13 新报价，经 CAN 转机（替换原 Golden Phoenix 表行；新报价无 M/N，<45K 按 +45K 计） */
        SIN: { w45: 2530, w100: 2330, w300: 2120, w500: 1920, w1000: 1920,
               transfer: true, via: "CAN", label: "CZ ICN–CAN–SIN（转机）", effective: "2026-11-13 ~", fsc: 0,
               cgc: [ { label: "MAWB", amount: 1900 }, { label: "HAWB", amount: 1900 } ],
               carrierNote: "FSC 없음（无燃油附加）· CGC 另计 1,900/MAWB + 1,900/HAWB",
               note: "CAN/SIN CZ353 ETD 08:35 / ETA 12:30 B78C（宽体）每日 · +1000K 原表未列，按 +500K 延用；无 N 段" },
        KUL: { w45: 2430, w100: 2220, w300: 2020, w500: 1820, w1000: 1820,
               transfer: true, via: "CAN", label: "CZ ICN–CAN–KUL（转机）", effective: "2026-11-13 ~", fsc: 0,
               cgc: [ { label: "MAWB", amount: 1900 }, { label: "HAWB", amount: 1900 } ],
               carrierNote: "FSC 없음（无燃油附加）· CGC 另计 1,900/MAWB + 1,900/HAWB",
               note: "CAN/KUL CZ349 ETD 08:30 / ETA 12:45 B789（宽体）每日 · +1000K 原表未列，按 +500K 延用；无 N 段" },
        PEN: { m: 55820, n: 2120, w45: 1800, w100: 1600, w300: 1400, w500: 1200, w1000: 1000 },
        BKI: { m: 55820, n: 2710, w45: 2300, w100: 2100, w300: 1900, w500: 1700, w1000: 1500 },
        HAN: { m: 55820, n: 2120, w45: 1800, w100: 1600, w300: 1400, w500: 1200, w1000: 1000 },
        SGN: { m: 55820, n: 2120, w45: 1800, w100: 1600, w300: 1400, w500: 1200, w1000: 1000 },
        CXR: { m: 55820, n: 1880, w45: 1600, w100: 1400, w300: 1200, w500: 1000, w1000: 800 },
        /* MNL：2026-11-13 新报价，经 CAN 转机（替换原表行） */
        MNL: { m: 56750, n: 2520, w45: 2140, w100: 1930, w300: 1730, w500: 1530, w1000: 1530,
               transfer: true, via: "CAN", label: "CZ ICN–CAN–MNL（转机）", effective: "2026-11-13 ~", fsc: 0,
               cgc: [ { label: "MAWB", amount: 1900 }, { label: "HAWB", amount: 1900 } ],
               carrierNote: "유가없고（无燃油附加）· CGC 另计 1,900/MAWB + 1,900/HAWB",
               note: "+500K 起 FLAT 1,530/kg" },
        CEB: { m: 55820, n: 4950, w45: 4090, w100: 3890, w300: 3690, w500: 3490, w1000: 3190 },
        CGK: { m: 55820, n: 3890, w45: 3190, w100: 2990, w300: 2790, w500: 2590, w1000: 2400 },
        DPS: { m: 55820, n: 2360, w45: 2000, w100: 1800, w300: 1600, w500: 1400, w1000: 1200 },
        PNH: { m: 55820, n: 4470, w45: 3690, w100: 3490, w300: 3190, w500: 2990, w1000: 2790 },
        REP: { m: 55820, n: 2360, w45: 2000, w100: 1800, w300: 1600, w500: 1400, w1000: 1200 },
        VTE: { m: 55820, n: 2000, w45: 1700, w100: 1500, w300: 1300, w500: 1100, w1000: 900 },
        RGN: { m: 54660, n: 3710, w45: 3050, w100: 2860, w300: 2670, w500: 2480, w1000: 2290 },

        /* —— 第1页补充（按规则选取：CX 优先，无 CX 取 CLOTHING，再取 ICN202601）—— */
        CAN: { m: 42500, n: 6050, w45: 2700, w100: 1700, w300: 1700, w500: 1700, w1000: 1700 }, // ICN20260020CX
        CGO: { m: 42500, n: 6780, w45: 2100, w100: 1900, w300: 1600, w500: 1500, w1000: 1500 }, // ICN202601
        CSX: { m: 42500, n: 4940, w45: 2100, w100: 1900, w300: 1600, w500: 1500, w1000: 1500 }, // ICN202601（无 CX/CLOTHING）
        DLC: { m: 42500, n: 3790, w45: 2380, w100: 850,  w300: 750,  w500: 650,  w1000: 550 },  // ICN202610DD CLOTHING
        SHE: { m: 42500, n: 3790, w45: 2380, w100: 850,  w300: 750,  w500: 650,  w1000: 550 },  // ICN202610DD CLOTHING
        SZX: { m: 42500, n: 4940, w45: 1700, w100: 1000, w300: 900,  w500: 900,  w1000: 900 },  // ICN20260020CX
        /* PVG：直飞仅特种运价，一般货走 T/S（+500K/+1000K 原表未列，按 +300K 延用） */
        PVG: { m: 42500, n: 5810, w45: 2500, w100: 1900, w300: 1600, w500: 1600, w1000: 1600 },
        /* TAO：CZ6010（+1000K 原表未列，按 +500K 延用） */
        TAO: { m: 42500, n: 6780, w45: 2100, w100: 1900, w300: 1600, w500: 1500, w1000: 1500,
               note: "CZ6010 · +1000K 原表未列，按 +500K 延用" },
        /* XIY：2026-11-13 新报价；CZ 无 ICN–XIY 直飞（flightconnections / flightmapper 仅 KE、OZ、MU 直飞），按转机标注 */
        XIY: { m: 42500, n: 5890, w45: 1000, w100: 1000, w300: 1000, w500: 1000, w1000: 1000,
               transfer: true, label: "CZ ICN–XIY（转机）", effective: "2026-11-13 ~",
               note: "CZ 无仁川—西安直飞，经国内转机 · +45K 起 FLAT 1,000/kg" },
      },
    },

    /* ===== 中国东方航空 MU（青岛）===== */
    MU: {
      code: "MU",
      label: "MU2044 ICN–TAO",
      effective: "2026-11 更新",
      allIn: true,
      fsc: 0,
      note: "ALL-IN（已含燃油附加与地勤，不再另计）",
      rates: {
        /* 原表仅列 +45K / +100K，N 段与 +300K 以上未列 */
        TAO: { m: null, n: null, w45: 2000, w100: 1000, w300: 1000, w500: 1000, w1000: 1000,
               note: "原表仅列 +45K／+100K，+300K 以上按 +100K 延用；N 段未列" },
      },
    },

    /* ===== 青岛航空 QW（青岛）===== */
    QW: {
      code: "QW",
      label: "QW902 ICN–TAO",
      effective: "2026-11 更新",
      fsc: 0,
      note: "FSC 없음（不含燃油附加）· M／N 适用至 45KG",
      cgc: [ { label: "MAWB", amount: 6600 }, { label: "HAWB", amount: 4400 } ],
      rates: {
        TAO: { m: null, n: null, w45: 2700, w100: 2000, w300: 2000, w500: 2000, w1000: 2000,
               note: "M／N 适用至 45KG（原表未列金额）· +300K 以上按 +100K 延用" },
      },
    },

    /* ===== 仁川航空 KJ（香港）===== */
    KJ: {
      code: "KJ",
      label: "KJ ICN–HKG",
      effective: "2026-11 更新",
      fsc: 1650,
      note: "FSC 1,650/kg（当前油价基准）",
      rates: {
        HKG: { m: 45000, n: 4700, w45: 600, w100: 300, w300: 300, w500: 300, w1000: 300,
               note: "+300K 以上原表未列，按 +100K 延用" },
        SIN: { w45: 2700, w100: 1400, w300: 1400, w500: 1400, w1000: 1400,
               label: "KJ ICN–SIN", effective: "2026-11-13 ~",
               carrierNote: "FSC 1,650/kg 另计",
               note: "+100K 运价需订舱时申请运价确认（CNFM）· 原表无 M/N，+300K 以上按 +100K 延用" },
      },
    },

    /* ===== 大韩航空 KE（香港，货运）===== */
    KEc: {
      code: "KE",
      label: "KE ICN–HKG",
      effective: "2026-11 更新",
      fsc: 1680,
      note: "FSC 1,680/kg（当前油价基准）· +100K 起 FLAT",
      rates: {
        HKG: { m: 46000, n: 4800, w45: 2200, w100: 650, w300: 650, w500: 650, w1000: 650,
               note: "+100K 起 FLAT 650/kg" },
        /* —— 东南亚（2026-11-13）：FSC 中距离；SIN/KUL 原表未写金额，按同期 KE MNL 报价的 1,230/kg 计 —— */
        SIN: { w45: 2800, w100: 1750, w300: 1750, w500: 1750, w1000: 1750,
               label: "KE ICN–SIN", effective: "2026-11-13 ~", fsc: 1230, cgc: [ { label: "MAWB", amount: 3000 } ],
               carrierNote: "FSC 中距离（按 1,230/kg 计，待确认）· CGC 3,000/MAWB 另计",
               note: "原表无 M/N，+300K 以上按 +100K 延用" },
        KUL: { w45: 3900, w100: 2900, w300: 2900, w500: 2900, w1000: 2900,
               label: "KE ICN–KUL", effective: "2026-11-13 ~", fsc: 1230, cgc: [ { label: "MAWB", amount: 3000 } ],
               carrierNote: "FSC 中距离（按 1,230/kg 计，待确认）· CGC 3,000/MAWB 另计",
               note: "原表无 M/N，+300K 以上按 +100K 延用" },
        MNL: { m: 55000, n: 6800, w45: 3900, w100: 2100, w300: 2100, w500: 2100, w1000: 2100,
               label: "KE ICN–MNL", effective: "2026-11-13 ~", fsc: 1230, cgc: [ { label: "MAWB", amount: 3000 } ],
               carrierNote: "FSC 1,230/kg · CGC 3,000/MAWB 另计",
               note: "+100K 起 FLAT 2,100/kg" },
      },
    },

    /* ===== 普莱米亚航空 YP（香港）===== */
    YP: {
      code: "YP",
      label: "YP ICN–HKG",
      effective: "2026-11 更新",
      fsc: 1480,
      note: "FSC 1,480/kg（当前油价基准）· +100K 起 FLAT",
      cgc: [ { label: "MAWB", amount: 3000 } ],
      rates: {
        HKG: { m: 45000, n: 4500, w45: 1100, w100: 400, w300: 400, w500: 400, w1000: 400,
               note: "+100K 起 FLAT 400/kg" },
      },
    },

    /* ===== 韩亚航空 OZ（马尼拉）===== */
    OZc: {
      code: "OZ",
      label: "OZ ICN–MNL",
      effective: "2026-11-13 ~",
      fsc: 1230,
      note: "FSC 1,230/kg · ECC 3,000/MAWB 另计",
      cgc: [ { label: "ECC", amount: 3000 } ],
      rates: {
        MNL: { m: 55000, n: 6800, w45: 3100, w100: 2300, w300: 2300, w500: 2300, w1000: 2300,
               note: "+100K 起 FLAT 2,300/kg" },
      },
    },

    /* ===== 顺丰航空 O3（济南）· 对外售价，不乘系数 ===== */
    SF: {
      code: "O3",
      label: "O3236 ICN–TNA",
      effective: "2026-11-13 ~",
      noMarkup: true,
      fsc: 0,
      note: "对外价 450/kg，不分段（其他费用不变）",
      rates: {
        TNA: { n: 450, w45: 450, w100: 450, w300: 450, w500: 450, w1000: 450 },
      },
    },

    /* ===== 中国邮政航空 CF（西安）===== */
    CF: {
      code: "CF",
      label: "CF202 ICN–XIY",
      effective: "2026-11-13 ~",
      allIn: true,
      fsc: 0,
      note: "ALL-IN（已含燃油附加与地勤，不再另计）· 周三／周五 20:30–23:00",
      rates: {
        XIY: { m: 46000, n: 5890, w45: 5650, w100: 5650, w300: 5650, w500: 5650, w1000: 5650,
               note: "+45K 起 FLAT 5,650/kg" },
      },
    },

    /* ===== 亚洲航空X D7（吉隆坡，直飞宽体）===== */
    D7: {
      code: "D7",
      label: "D7 ICN–KUL 直飞",
      effective: "2026-11-13 ~",
      fsc: 980,
      note: "FSC 980/kg · AWB FEE 8,000/MAWB + MC FEE 5,500/MAWB 另计",
      cgc: [ { label: "AWB FEE", amount: 8000 }, { label: "MC FEE", amount: 5500 } ],
      rates: {
        /* 原表「+45K 5,000 / +300K 4,200 / +300, 3,900」+300 重复出现，按 +100K 4,200 / +300K 3,900 理解（待确认） */
        KUL: { m: 121000, n: 6600, w45: 5000, w100: 4200, w300: 3900, w500: 3700, w1000: 3600,
               note: "原表 +300K 出现两次（4,200 / 3,900），暂按 +100K 4,200、+300K 3,900 计，待确认" },
      },
    },

    /* ===== 新加坡航空 SQ（新加坡）===== */
    SQ: {
      code: "SQ",
      label: "SQ ICN–SIN",
      effective: "2026-11-13 ~",
      fsc: 0,
      note: "FSC 中距离另计（原表未写金额，未计入合计）",
      rates: {
        SIN: { w45: 2900, w100: 1500, w300: 1500, w500: 1500, w1000: 1500,
               note: "原表无 M/N，+300K 以上按 +100K 延用" },
      },
    },

    /* ===== 济州航空 7C（香港）===== */
    "7C": {
      code: "7C",
      label: "7C ICN–HKG",
      effective: "2026-11-13 ~",
      allIn: true,
      fsc: 0,
      note: "ALL-IN（已含燃油附加与地勤，不再另计）",
      rates: {
        HKG: { m: 45000, n: 4400, w45: 2300, w100: 1700, w300: 1700, w500: 1700, w1000: 1700,
               note: "+100K 起 FLAT 1,700/kg" },
      },
    },

    /* ===== 德威航空 TW（香港）===== */
    TW: {
      code: "TW",
      label: "TW ICN–HKG",
      effective: "2026-11-13 ~",
      allIn: true,
      fsc: 0,
      note: "ALL-IN（已含燃油附加与地勤，不再另计）",
      rates: {
        HKG: { m: 45000, n: 4500, w45: 1200, w100: 1200, w300: 1200, w500: 1200, w1000: 1200,
               note: "+45K 起 FLAT 1,200/kg" },
      },
    },

    /* ===== 墨西哥航空 AM（墨西哥城）===== */
    AM: {
      code: "AM",
      label: "AM091 ICN–MEX",
      effective: "2026-11-13 ~",
      allIn: true,
      fsc: 0,
      note: "ALL-IN · AM091 ETD 11:40 / ETA 10:35 B789（宽体）每日",
      rates: {
        MEX: { w45: 14000, w100: 11500, w300: 11500, w500: 11500, w1000: 11500,
               note: "原表无 M/N（<45K 按 +45K 计），+300K 以上按 +100K 延用" },
      },
    },
  },
};

/* 手工补充班期（自动抓取源没有的航班，例如 CZ 全货机）
 * 格式： "目的地代码|航司二字码": [ { no:"CZ6010", days:"Tue,Fri", dep:"01:20", arr:"02:20" } ]
 * days 用英文缩写：Mon,Tue,Wed,Thu,Fri,Sat,Sun；每天飞写 "Daily"
 * 同一航班号不同班期可写多条；手工条目会整体替换自动数据中的同号航班
 */
const MANUAL_FLIGHTS = {
  // "TAO|CZ": [ { no: "CZ6010", days: "Tue,Fri", dep: "01:20", arr: "02:20" } ],
  /* 2026-11-13 补充 · 次日到达的 arr 直接写当地时刻（与自动数据一致） */
  "XIY|CF": [ { no: "CF202", days: "Wed,Fri", dep: "20:30", arr: "23:00", ac: "B737F", mode: "cgo" } ],
  "TNA|O3": [ { no: "O3236", days: "Mon,Wed,Fri", dep: "04:00", arr: "05:00", ac: "B757F", mode: "cgo" } ],
  "MEX|AM": [ { no: "AM091", days: "Daily", dep: "11:40", arr: "10:35", ac: "B789", mode: "pax" } ],
  /* CI 新加坡班期（按用户提供的 CI 班期表录入，原表应为经台北 TPE 的航段时刻；频率数字按 1=周一…7=周日） */
  "SIN|CI": [
    { no: "CI753",  days: "Daily",   dep: "08:20", arr: "13:05", ac: "A359",      mode: "pax" },
    { no: "CI755",  days: "Daily",   dep: "19:55", arr: "00:40", ac: "A321",      mode: "pax" },
    { no: "CI5871", days: "Thu,Sat", dep: "23:10", arr: "04:00", ac: "B77F/B74F", mode: "cgo" },
    { no: "CI5877", days: "Mon",     dep: "23:50", arr: "04:40", ac: "B74F",      mode: "cgo" },
    { no: "CI5883", days: "Tue",     dep: "23:10", arr: "04:00", ac: "B77F",      mode: "cgo" },
    { no: "CI6581", days: "Tue",     dep: "08:40", arr: "13:30", ac: "B77F",      mode: "cgo" },
    { no: "CI6865", days: "Sun",     dep: "06:30", arr: "11:20", ac: "B74F",      mode: "cgo" },
    { no: "CI6865", days: "Fri",     dep: "23:10", arr: "04:00", ac: "B74F",      mode: "cgo" },
    { no: "CI6871", days: "Thu",     dep: "23:10", arr: "04:00", ac: "B74F",      mode: "cgo" },
    { no: "CI6875", days: "Wed",     dep: "23:10", arr: "04:00", ac: "B74F",      mode: "cgo" },
    { no: "CI6875", days: "Fri",     dep: "05:55", arr: "10:45", ac: "B74F",      mode: "cgo" },
  ],
};

/* 城市二级分组（中国八大区 / 日本四岛；东南亚、美洲不分） */
const SUBREGIONS = {
  cn: [
    { id: "hd",  name: "华东",     en: "EAST CHINA" },
    { id: "hb",  name: "华北",     en: "NORTH CHINA" },
    { id: "db",  name: "东北",     en: "NORTHEAST" },
    { id: "hn",  name: "华南",     en: "SOUTH CHINA" },
    { id: "hz",  name: "华中",     en: "CENTRAL CHINA" },
    { id: "xn",  name: "西南",     en: "SOUTHWEST" },
    { id: "xb",  name: "西北",     en: "NORTHWEST" },
    { id: "gat", name: "港澳",     en: "HK & MACAU" },
  ],
  jp: [
    { id: "hs",  name: "本州",       en: "HONSHU" },
    { id: "ky",  name: "九州·冲绳",  en: "KYUSHU & OKINAWA" },
    { id: "hkd", name: "北海道",     en: "HOKKAIDO" },
    { id: "sk",  name: "四国",       en: "SHIKOKU" },
  ],
  sea: [],
  am: [],
};
