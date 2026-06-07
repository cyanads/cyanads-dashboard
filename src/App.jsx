import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = "/api/data";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:         "#0a0c10",
  surface:    "#111318",
  surfaceAlt: "#161a22",
  border:     "#1e2330",
  borderHi:   "#2a3040",
  text:       "#e2e8f0",
  textMuted:  "#64748b",
  textDim:    "#3a4558",
  accent:     "#00d4ff",
  green:      "#22c55e",
  red:        "#ef4444",
  amber:      "#f59e0b",
  pll:        "#00d4ff",
  attekmi:    "#a78bfa",
  iscream:    "#fb923c",
};

// ─── Data Fetching ────────────────────────────────────────────────────────────
async function fetchMonth(month) {
  const url = month ? `${API_URL}?month=${month}` : API_URL;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error("Bad JSON: " + text.slice(0, 120)); }
}

function useSheetData() {
  const [raw, setRaw] = useState(null);
  const [rawLastMonth, setRawLastMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);
  const lastMonthFetched = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const json = await fetchMonth(null);
      setRaw(json);
      setLastFetched(new Date());
    } catch (e) {
      console.error("Data fetch failed:", e.message);
      setError(`Live data unavailable (${e.message}) — showing demo data.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLastMonth = useCallback(async () => {
    if (lastMonthFetched.current) return;
    lastMonthFetched.current = true;
    try {
      const now = new Date();
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,"0")}`;
      const json = await fetchMonth(month);
      setRawLastMonth(json);
    } catch (e) {
      console.error("Last month fetch failed:", e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { raw, rawLastMonth, loading, lastFetched, error, refresh: fetchData, fetchLastMonth };
}

// ─── Data Transform ───────────────────────────────────────────────────────────
// Maps raw sheet rows into the shape the dashboard expects.
function transformData(raw) {
  if (!raw) return null;

  const result = {};

  // Normalize any date string to YYYY-MM-DD
  const toISO = (d) => {
    if (!d) return "";
    const s = String(d).trim();
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // M/D/YYYY or MM/DD/YYYY
    const parts = s.split("/");
    if (parts.length === 3) {
      const [m, day, y] = parts;
      return `${y}-${m.padStart(2,"0")}-${day.padStart(2,"0")}`;
    }
    // Fallback: let Date parse it
    const dt = new Date(d);
    if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    return s;
  };

  // ── PLL ──
  const pllRows = raw["PLL"] || [];
  const pllHourly = pllRows.map(r => ({
    label: `${toISO(r.DATE)} ${String(r.HOUR).padStart(2,"0")}:00`,
    date: toISO(r.DATE),
    hour: r.HOUR,
    revenue:     +parseFloat(r.DEMAND_PAYOUT  || 0).toFixed(2),
    pub_payout:  +parseFloat(r.PUB_PAYOUT     || 0).toFixed(2),
    limelight:   +parseFloat(r.LIMELIGHT_FEE  || 0).toFixed(2),
    profit:      +parseFloat(r.PROFIT         || 0).toFixed(2),
    impressions: +parseInt(r.IMPRESSIONS      || 0),
    requests:    +parseInt(r.REQUESTS         || 0),
    fill_rate:   +parseFloat(r.FILL_RATE_PCT  || 0).toFixed(2),
  }));
  const pllMtd = pllHourly.reduce((acc, r) => ({
    revenue:     acc.revenue     + r.revenue,
    pub_cost:    acc.pub_cost    + r.pub_payout,
    limelight_fee: acc.limelight_fee + r.limelight,
    profit:      acc.profit      + r.profit,
    impressions: acc.impressions + r.impressions,
  }), { revenue:0, pub_cost:0, limelight_fee:0, profit:0, impressions:0 });
  pllMtd.margin_pct = pllMtd.revenue > 0 ? +((pllMtd.profit / pllMtd.revenue) * 100).toFixed(1) : 0;
  result["PLL"] = { color: T.pll, hourly: pllHourly, mtd: pllMtd };

  // ── Attekmi ──
  const attRows = raw["Attekmi"] || [];
  const attHourly = attRows.map(r => ({
    label: `${toISO(r.DATE)} ${String(r.HOUR).padStart(2,"0")}:00`,
    date: toISO(r.DATE),
    hour: r.HOUR,
    revenue:    +parseFloat(r.DEMAND_PAYOUT || 0).toFixed(2),
    pub_payout: +parseFloat(r.PUB_PAYOUT   || 0).toFixed(2),
    server_fee: +parseFloat(r.SERVER_FEE   || 0).toFixed(2),
    profit:     +parseFloat(r.PROFIT       || 0).toFixed(2),
    impressions:+parseInt(r.IMPRESSIONS    || 0),
    requests:   +parseInt(r.REQUESTS       || 0),
    fill_rate:  +parseFloat(r.FILL_RATE_PCT|| 0).toFixed(2),
  }));
  const attMtd = attHourly.reduce((acc, r) => ({
    revenue:    acc.revenue    + r.revenue,
    pub_cost:   acc.pub_cost   + r.pub_payout,
    server_fee: acc.server_fee + r.server_fee,
    profit:     acc.profit     + r.profit,
    impressions:acc.impressions+ r.impressions,
  }), { revenue:0, pub_cost:0, server_fee:0, profit:0, impressions:0 });
  attMtd.margin_pct = attMtd.revenue > 0 ? +((attMtd.profit / attMtd.revenue) * 100).toFixed(1) : 0;
  result["Attekmi"] = { color: T.attekmi, hourly: attHourly, mtd: attMtd };

  // ── IScream ──
  const iscRows = raw["IScream"] || [];
  const iscHourly = iscRows.map(r => ({
    label: `${toISO(r.DATE)} ${String(r.HOUR).padStart(2,"0")}:00`,
    date: toISO(r.DATE),
    hour: r.HOUR,
    revenue:      +parseFloat(r.DEMAND_PAYOUT || 0).toFixed(2),
    pub_payout:   +parseFloat(r.PUB_PAYOUT    || 0).toFixed(2),
    platform_fee: +parseFloat(r.PLATFORM_FEE  || 0).toFixed(2),
    profit:       +parseFloat(r.NET_PAYOUT    || 0).toFixed(2),
    impressions:  +parseInt(r.IMPRESSIONS     || 0),
    requests:     +parseInt(r.REQUESTS        || 0),
    fill_rate:    +parseFloat(r.FILL_RATE_PCT || 0).toFixed(2),
  }));
  const iscMtd = iscHourly.reduce((acc, r) => ({
    revenue:      acc.revenue      + r.revenue,
    pub_cost:     acc.pub_cost     + r.pub_payout,
    platform_cost:acc.platform_cost+ r.platform_fee,
    profit:       acc.profit       + r.profit,
    impressions:  acc.impressions  + r.impressions,
  }), { revenue:0, pub_cost:0, platform_cost:0, profit:0, impressions:0 });
  iscMtd.margin_pct = iscMtd.revenue > 0 ? +((iscMtd.profit / iscMtd.revenue) * 100).toFixed(1) : 0;
  result["IScream"] = { color: T.iscream, hourly: iscHourly, mtd: iscMtd };

  return result;
}

// ─── Fallback Mock Data (shown while loading or on error) ────────────────────
const generateMock = (baseRev, variance, hours = 48) => {
  const data = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i--) {
    const h = new Date(now);
    h.setHours(h.getHours() - i, 0, 0, 0);
    const rev = Math.max(0, baseRev + (Math.random() - 0.45) * variance);
    const cost = rev * (0.35 + Math.random() * 0.1);
    const dateStr = h.toISOString().slice(0, 10);
    data.push({
      label: `${dateStr} ${String(h.getHours()).padStart(2,"0")}:00`,
      date: dateStr,
      hour: h.getHours(),
      revenue: +rev.toFixed(2), profit: +(rev - cost - rev * 0.1).toFixed(2),
      pub_payout: +cost.toFixed(2), limelight: +(rev * 0.1).toFixed(2),
      server_fee: +(rev * 0.1).toFixed(2), platform_fee: +(rev * 0.05).toFixed(2),
      impressions: Math.floor(rev * 1200), fill_rate: +(Math.random() * 5).toFixed(2),
      requests: Math.floor(rev * 8000),
    });
  }
  return data;
};
const MOCK_DATA = {
  PLL:     { color: T.pll,     hourly: generateMock(62,30), mtd: { revenue:14820, pub_cost:9110, limelight_fee:1482, profit:4228, margin_pct:28.5, impressions:18420000 } },
  Attekmi: { color: T.attekmi, hourly: generateMock(38,20), mtd: { revenue:8940,  pub_cost:5800, server_fee:441,    profit:2697, margin_pct:30.2, impressions:11200000 } },
  IScream: { color: T.iscream, hourly: generateMock(25,15), mtd: { revenue:5620,  pub_cost:3410, platform_cost:224, profit:1985, margin_pct:35.3, impressions:7840000  } },
};

const MOCK_ALERTS = [
  { ts:"2026-05-29 11:05", source:"PLL",     type:"INCREASE", dollar:72.40,  pct:84.2,  bundle:"com.gameapp.adventure" },
  { ts:"2026-05-29 08:05", source:"Attekmi", type:"DROP",     dollar:-55.20, pct:-62.1, bundle:"com.news.daily" },
  { ts:"2026-05-28 22:05", source:"IScream", type:"INCREASE", dollar:51.80,  pct:70.3,  bundle:"com.fitness.tracker" },
  { ts:"2026-05-28 17:05", source:"PLL",     type:"DROP",     dollar:-80.10, pct:-78.4, bundle:"com.weather.live" },
];
const MOCK_OPTIMIZER = [
  { publisher:"PubMatic SSP", action:"RAISE_MARGIN", current:"35%", proposed:"45%", ecpm:2.84, avg_bid:3.42, fill:"0.0182%", profit:48.20, outcome:"OUTCOME_POSITIVE" },
  { publisher:"OpenX DSP",    action:"HOLD",         current:"40%", proposed:"40%", ecpm:3.10, avg_bid:3.08, fill:"0.0244%", profit:32.10, outcome:"PROPOSED" },
  { publisher:"Magnite",      action:"LOWER_MARGIN", current:"50%", proposed:"40%", ecpm:1.20, avg_bid:2.80, fill:"0.0031%", profit:18.40, outcome:"OUTCOME_NEGATIVE" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt     = (v, d=2) => v==null ? "—" : `$${Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const fmtPct  = (v)      => v==null ? "—" : `${v>=0?"+":""}${v.toFixed(1)}%`;
const fmtImps = (v)      => v>=1000000 ? `${(v/1000000).toFixed(1)}M` : v>=1000 ? `${(v/1000).toFixed(0)}K` : String(v);
const posNeg  = (v)      => v>=0 ? T.green : T.red;

// ─── Shared UI Components ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <div style={{ color:T.textMuted, marginBottom:6, fontFamily:"monospace" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, display:"flex", justifyContent:"space-between", gap:16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight:600 }}>{p.name==="impressions"||p.name==="fill_rate" ? p.value : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, sub, color:c, icon }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 18px", display:"flex", flexDirection:"column", gap:4, transition:"border-color 0.2s" }}
    onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHi}
    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
    <div style={{ color:T.textMuted, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>{icon} {label}</div>
    <div style={{ color:c||T.text, fontSize:20, fontWeight:700, fontFamily:"'Syne',sans-serif", lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ color:T.textMuted, fontSize:11 }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom:14 }}>
    <h2 style={{ color:T.text, fontSize:15, fontWeight:700, fontFamily:"'Syne',sans-serif", margin:0, letterSpacing:"-0.02em" }}>{title}</h2>
    {sub && <div style={{ color:T.textMuted, fontSize:11, marginTop:2 }}>{sub}</div>}
  </div>
);

const SourceBadge = ({ source }) => {
  const cols = { PLL:T.pll, Attekmi:T.attekmi, IScream:T.iscream };
  const c = cols[source]||T.accent;
  return <span style={{ background:c+"22", color:c, border:`1px solid ${c}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontFamily:"monospace", fontWeight:600 }}>{source}</span>;
};

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${T.border}`, overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={()=>onChange(t.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 14px", fontSize:12, fontFamily:"'Syne',sans-serif", color:active===t.id?T.accent:T.textMuted, borderBottom:`2px solid ${active===t.id?T.accent:"transparent"}`, marginBottom:-1, whiteSpace:"nowrap", transition:"color 0.15s" }}>{t.icon} {t.label}</button>
    ))}
  </div>
);

const SourceSelector = ({ sources, active, onChange }) => (
  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
    {sources.map(s => {
      const isActive = active.includes(s);
      const c = {PLL:T.pll,Attekmi:T.attekmi,IScream:T.iscream}[s]||T.accent;
      return <button key={s} onClick={()=>onChange(s)} style={{ background:isActive?c+"22":"transparent", color:isActive?c:T.textMuted, border:`1px solid ${isActive?c+"66":T.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:"monospace", fontWeight:600, transition:"all 0.15s" }}>{s}</button>;
    })}
  </div>
);

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const PRESET_GROUPS = [
  {
    label: "Rolling",
    presets: [
      { id:"12h", label:"12h" },
      { id:"24h", label:"24h" },
      { id:"48h", label:"48h" },
    ],
  },
  {
    label: "Calendar",
    presets: [
      { id:"today",      label:"Today"      },
      { id:"yesterday",  label:"Yesterday"  },
      { id:"7d",         label:"7 Days"     },
      { id:"mtd",        label:"MTD"        },
      { id:"last_month", label:"Last Month" },
    ],
  },
];
const ALL_PRESETS = PRESET_GROUPS.flatMap(g => g.presets);

const OverviewTab = ({ DATA, DATA_LM, fetchLastMonth }) => {
  const [preset, setPreset] = useState("24h");
  const [activeSources, setActiveSources] = useState(["PLL","Attekmi","IScream"]);
  const toggleSource = s => setActiveSources(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  // Trigger last month fetch when that preset is selected
  useEffect(() => {
    if (preset === "last_month") fetchLastMonth();
  }, [preset, fetchLastMonth]);

  // Derive filtered hourly rows from selected preset
  const getFilteredHourly = (src) => {
    const now = new Date();
    // For last_month, use the separately-fetched DATA_LM
    if (preset === "last_month") {
      return DATA_LM ? (DATA_LM[src]?.hourly || []) : [];
    }
    const sourceHourly = DATA[src]?.hourly || [];
    if (!sourceHourly.length) return [];
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now - 86400000).toISOString().slice(0, 10);
    const mtdMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    switch (preset) {
      case "12h": return sourceHourly.slice(-12);
      case "24h": return sourceHourly.slice(-24);
      case "48h": return sourceHourly.slice(-48);
      case "today":      return sourceHourly.filter(r => r.date === todayStr);
      case "yesterday":  return sourceHourly.filter(r => r.date === yesterdayStr);
      case "7d": {
        const cutoff = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
        return sourceHourly.filter(r => r.date >= cutoff);
      }
      case "mtd": return sourceHourly.filter(r => r.date?.startsWith(mtdMonth));
      default:    return sourceHourly;
    }
  };

  // Aggregate filtered rows per source
  const aggregateRows = (rows) => rows.reduce((acc, r) => ({
    revenue:      acc.revenue      + (r.revenue     || 0),
    pub_cost:     acc.pub_cost     + (r.pub_payout  || 0),
    limelight_fee:acc.limelight_fee+ (r.limelight   || 0),
    server_fee:   acc.server_fee   + (r.server_fee  || 0),
    platform_cost:acc.platform_cost+ (r.platform_fee|| 0),
    profit:       acc.profit       + (r.profit      || 0),
    impressions:  acc.impressions  + (r.impressions || 0),
  }), { revenue:0, pub_cost:0, limelight_fee:0, server_fee:0, platform_cost:0, profit:0, impressions:0 });

  const filteredPLL = getFilteredHourly("PLL");
  const filteredAtt = getFilteredHourly("Attekmi");
  const filteredIsc = getFilteredHourly("IScream");
  const aggPLL = aggregateRows(filteredPLL);
  const aggAtt = aggregateRows(filteredAtt);
  const aggIsc = aggregateRows(filteredIsc);
  aggPLL.margin_pct = aggPLL.revenue > 0 ? +((aggPLL.profit / aggPLL.revenue) * 100).toFixed(1) : 0;
  aggAtt.margin_pct = aggAtt.revenue > 0 ? +((aggAtt.profit / aggAtt.revenue) * 100).toFixed(1) : 0;
  aggIsc.margin_pct = aggIsc.revenue > 0 ? +((aggIsc.profit / aggIsc.revenue) * 100).toFixed(1) : 0;

  const agg = {
    revenue:     aggPLL.revenue + aggAtt.revenue + aggIsc.revenue,
    profit:      aggPLL.profit  + aggAtt.profit  + aggIsc.profit,
    impressions: aggPLL.impressions + aggAtt.impressions + aggIsc.impressions,
  };
  agg.margin = agg.revenue > 0 ? agg.profit / agg.revenue * 100 : 0;

  // Build merged hourly series for the chart from filtered rows
  // Align by label (date+hour) across sources
  const allLabels = [...new Set([
    ...filteredPLL.map(r=>r.label),
    ...filteredAtt.map(r=>r.label),
    ...filteredIsc.map(r=>r.label),
  ])].sort();
  const pllMap = Object.fromEntries(filteredPLL.map(r=>[r.label, r.revenue]));
  const attMap = Object.fromEntries(filteredAtt.map(r=>[r.label, r.revenue]));
  const iscMap = Object.fromEntries(filteredIsc.map(r=>[r.label, r.revenue]));
  const mergedHourly = allLabels.map(lbl => {
    const r = { label: lbl };
    if (activeSources.includes("PLL"))     r.pll_rev = pllMap[lbl] ?? 0;
    if (activeSources.includes("Attekmi")) r.att_rev = attMap[lbl] ?? 0;
    if (activeSources.includes("IScream")) r.isc_rev = iscMap[lbl] ?? 0;
    return r;
  });

  const presetLabel = ALL_PRESETS.find(p=>p.id===preset)?.label || "Selected Range";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
      {/* Date Range Selector */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <SectionHeader title="Overview" sub={`As of ${new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} UTC`} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {PRESET_GROUPS.map((group, gi) => (
            <div key={group.label} style={{ display:"flex", gap:3, alignItems:"center" }}>
              {gi > 0 && <span style={{ color:T.textDim, fontSize:12, margin:"0 2px" }}>|</span>}
              {group.presets.map(p => (
                <button key={p.id} onClick={()=>setPreset(p.id)} style={{ background:preset===p.id?T.accent+"22":"transparent", color:preset===p.id?T.accent:T.textMuted, border:`1px solid ${preset===p.id?T.accent+"66":T.border}`, borderRadius:6, padding:"5px 11px", fontSize:11, cursor:"pointer", fontFamily:"monospace", fontWeight:preset===p.id?700:400, transition:"all 0.15s" }}>{p.label}</button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 }}>
        <KpiCard label="Total Revenue"  value={fmt(agg.revenue,0)}    sub={presetLabel}                              color={T.accent}   icon="💰" />
        <KpiCard label="Net Profit"     value={fmt(agg.profit,0)}     sub={`${agg.margin.toFixed(1)}% margin`}      color={T.green}    icon="📈" />
        <KpiCard label="Impressions"    value={fmtImps(agg.impressions)} sub={presetLabel}                           icon="👁" />
        <KpiCard label="PLL Revenue"    value={fmt(aggPLL.revenue,0)} sub={`${aggPLL.margin_pct}% margin`}          color={T.pll}      icon="⬟" />
        <KpiCard label="Attekmi Rev"    value={fmt(aggAtt.revenue,0)} sub={`${aggAtt.margin_pct}% margin`}          color={T.attekmi}  icon="⬡" />
        <KpiCard label="IScream Rev"    value={fmt(aggIsc.revenue,0)} sub={`${aggIsc.margin_pct}% margin`}          color={T.iscream}  icon="⬢" />
      </div>

      {/* Chart — driven by the same date range, no separate time selector */}
      {preset === "last_month" && !DATA_LM && <div style={{ color:T.amber, fontSize:12, fontFamily:"monospace", padding:"8px 0" }}>⏳ Loading last month data…</div>}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
          <SectionHeader title={`Hourly Revenue · ${presetLabel}`} sub="Demand payout per source" />
          <SourceSelector sources={["PLL","Attekmi","IScream"]} active={activeSources} onChange={toggleSource} />
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={mergedHourly} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize:9, fill:T.textMuted }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize:9, fill:T.textMuted }} tickFormatter={v=>`$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            {activeSources.includes("PLL")     && <Line type="monotone" dataKey="pll_rev" name="PLL"     stroke={T.pll}     strokeWidth={2} dot={false} />}
            {activeSources.includes("Attekmi") && <Line type="monotone" dataKey="att_rev" name="Attekmi" stroke={T.attekmi} strokeWidth={2} dot={false} />}
            {activeSources.includes("IScream") && <Line type="monotone" dataKey="isc_rev" name="IScream" stroke={T.iscream} strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-source breakdown cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
        {[
          ["PLL",     aggPLL, [["Revenue",aggPLL.revenue,T.text],["Pub Cost",-aggPLL.pub_cost,T.textMuted],["Limelight Fee (10%)",-aggPLL.limelight_fee,T.textMuted],["Net Profit",aggPLL.profit,T.green]]],
          ["Attekmi", aggAtt, [["Revenue",aggAtt.revenue,T.text],["Pub Cost",-aggAtt.pub_cost,T.textMuted],["Server Fee (14%)",-aggAtt.server_fee,T.textMuted],["Net Profit",aggAtt.profit,T.green]]],
          ["IScream", aggIsc, [["Revenue",aggIsc.revenue,T.text],["Pub Cost",-aggIsc.pub_cost,T.textMuted],["Platform Cost",-aggIsc.platform_cost,T.textMuted],["Net Profit",aggIsc.profit,T.green]]],
        ].map(([src, srcAgg, rows]) => (
          <div key={src} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <SourceBadge source={src} />
              <span style={{ color:T.textMuted, fontSize:11, fontFamily:"monospace" }}>{srcAgg.margin_pct}% margin</span>
            </div>
            {rows.map(([label,val,c]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:12, borderBottom:`1px solid ${label==="Net Profit"?"transparent":T.border}`, padding:"7px 0" }}>
                <span style={{ color:T.textMuted }}>{label}</span>
                <span style={{ color:c, fontFamily:"monospace", fontWeight:label==="Net Profit"?700:400 }}>{val<0?`-${fmt(Math.abs(val))}`:fmt(val)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Hourly Monitor Tab ───────────────────────────────────────────────────────
const HourlyTab = ({ DATA }) => {
  const [source, setSource] = useState("PLL");
  const [metric, setMetric] = useState("revenue");
  const d = DATA[source];
  const last = d.hourly[d.hourly.length-1] || {};
  const prev = d.hourly[d.hourly.length-2] || {};
  const change    = (last.revenue||0) - (prev.revenue||0);
  const changePct = prev.revenue ? (change/prev.revenue)*100 : 0;
  const alertTriggered = Math.abs(changePct)>=50 || Math.abs(change)>=50;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <SectionHeader title="Hourly Monitor" sub="Threshold: ±50% or ±$50 triggers alert + detail report" />
        <SourceSelector sources={["PLL","Attekmi","IScream"]} active={[source]} onChange={setSource} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
        <KpiCard label="Last Hour Rev"  value={fmt(last.revenue)}   color={T.accent}                              icon="⏱" />
        <KpiCard label="Hour Change"    value={`${change>=0?"+":""}${fmt(change)}`} sub={fmtPct(changePct)} color={posNeg(change)} icon={change>=0?"🔺":"🔻"} />
        <KpiCard label="Alert Status"   value={alertTriggered?"TRIGGERED":"NORMAL"} color={alertTriggered?T.red:T.green} icon={alertTriggered?"🚨":"✅"} />
        <KpiCard label="Impressions"    value={fmtImps(last.impressions||0)} sub="this hour"                      icon="👁" />
        <KpiCard label="Fill Rate"      value={`${last.fill_rate||0}%`}      sub="this hour"                      icon="📡" />
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
          <span style={{ color:T.text, fontWeight:600, fontFamily:"'Syne',sans-serif" }}>{source} — 48h Trend</span>
          <div style={{ display:"flex", gap:4 }}>
            {["revenue","profit","impressions","fill_rate"].map(m => (
              <button key={m} onClick={()=>setMetric(m)} style={{ background:metric===m?d.color+"22":"transparent", color:metric===m?d.color:T.textMuted, border:`1px solid ${metric===m?d.color+"66":T.border}`, borderRadius:4, padding:"4px 9px", fontSize:11, cursor:"pointer", fontFamily:"monospace", textTransform:"capitalize" }}>{m}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.hourly} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={d.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={d.color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize:9, fill:T.textMuted }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize:9, fill:T.textMuted }} tickFormatter={v=>metric==="impressions"?fmtImps(v):`${metric==="fill_rate"?v+"%":"$"+v}`} />
            <Tooltip content={<CustomTooltip />} />
            {prev[metric] && <ReferenceLine y={prev[metric]} stroke={T.amber} strokeDasharray="4 4" />}
            <Area type="monotone" dataKey={metric} stroke={d.color} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <SectionHeader title="Last 12 Hours" />
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["Hour","Revenue","Profit","Fill Rate","Impressions","Δ Rev"].map(h=>(
                  <th key={h} style={{ color:T.textMuted, textAlign:h==="Hour"?"left":"right", padding:"6px 10px", fontFamily:"monospace", fontWeight:400, fontSize:10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.hourly.slice(-12).reverse().map((row,i)=>{
                const prevRow = d.hourly[d.hourly.length-12+(11-i)-1];
                const chg = prevRow ? row.revenue-prevRow.revenue : 0;
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background:i===0?T.accent+"08":"transparent" }}>
                    <td style={{ color:i===0?T.accent:T.text, padding:"8px 10px", fontFamily:"monospace", fontSize:11 }}>{row.label}</td>
                    <td style={{ color:T.text,   textAlign:"right", padding:"8px 10px", fontFamily:"monospace" }}>{fmt(row.revenue)}</td>
                    <td style={{ color:posNeg(row.profit), textAlign:"right", padding:"8px 10px", fontFamily:"monospace" }}>{fmt(row.profit)}</td>
                    <td style={{ color:T.textMuted, textAlign:"right", padding:"8px 10px", fontFamily:"monospace" }}>{row.fill_rate}%</td>
                    <td style={{ color:T.textMuted, textAlign:"right", padding:"8px 10px", fontFamily:"monospace" }}>{fmtImps(row.impressions)}</td>
                    <td style={{ color:posNeg(chg), textAlign:"right", padding:"8px 10px", fontFamily:"monospace" }}>{chg>=0?"+":""}{fmt(chg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Alerts Tab ───────────────────────────────────────────────────────────────
const AlertsTab = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
    <SectionHeader title="Alert History" sub="Revenue threshold breaches — ±50% or ±$50" />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
      <KpiCard label="Total Alerts"      value={MOCK_ALERTS.length}                                  icon="🔔" />
      <KpiCard label="Increases"         value={MOCK_ALERTS.filter(a=>a.type==="INCREASE").length}   color={T.green} icon="🔺" />
      <KpiCard label="Drops"             value={MOCK_ALERTS.filter(a=>a.type==="DROP").length}       color={T.red}   icon="🔻" />
      <KpiCard label="Campaigns Created" value={2}                                                   color={T.accent} icon="🤖" />
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {MOCK_ALERTS.map((a,i)=>(
        <div key={i} style={{ background:T.surface, border:`1px solid ${a.type==="INCREASE"?T.green+"33":T.red+"33"}`, borderLeft:`3px solid ${a.type==="INCREASE"?T.green:T.red}`, borderRadius:10, padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span>{a.type==="INCREASE"?"🔺":"🔻"}</span>
              <SourceBadge source={a.source} />
              <span style={{ color:a.type==="INCREASE"?T.green:T.red, fontWeight:700, fontFamily:"monospace", fontSize:13 }}>{a.dollar>=0?"+":""}{fmt(a.dollar)} / {a.pct>=0?"+":""}{a.pct.toFixed(1)}%</span>
            </div>
            <div style={{ color:T.textMuted, fontSize:11, fontFamily:"monospace" }}>{a.ts} UTC · {a.bundle}</div>
          </div>
          {a.type==="INCREASE" && a.source!=="IScream" && (
            <span style={{ background:T.accent+"22", color:T.accent, border:`1px solid ${T.accent}44`, borderRadius:4, padding:"3px 8px", fontSize:11, fontFamily:"monospace" }}>🤖 Campaign duplicated</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─── Margin Optimizer Tab ─────────────────────────────────────────────────────
const OptimizerTab = () => {
  const actionColor  = { RAISE_MARGIN:T.green, LOWER_MARGIN:T.red, HOLD:T.textMuted };
  const outcomeColor = { OUTCOME_POSITIVE:T.green, OUTCOME_NEGATIVE:T.red, OUTCOME_NEUTRAL:T.amber, PROPOSED:T.accent };
  const outcomeLabel = { OUTCOME_POSITIVE:"✅ Positive", OUTCOME_NEGATIVE:"❌ Negative", OUTCOME_NEUTRAL:"⚪ Neutral", PROPOSED:"⏳ Proposed" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <SectionHeader title="Margin Optimizer" sub="Phase 1 — supervised proposals only" />
      <div style={{ background:T.amber+"11", border:`1px solid ${T.amber}33`, borderRadius:8, padding:"10px 14px", color:T.amber, fontSize:12 }}>
        ⚠️ <strong>Supervised Mode</strong> — Proposals require manual review. MARGIN_FLOOR=30%, CEILING=70%, STEP=10%.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
        <KpiCard label="Evaluated"       value={MOCK_OPTIMIZER.length}                                        icon="📊" />
        <KpiCard label="Raise Proposals" value={MOCK_OPTIMIZER.filter(r=>r.action==="RAISE_MARGIN").length}  color={T.green} icon="🔺" />
        <KpiCard label="Lower Proposals" value={MOCK_OPTIMIZER.filter(r=>r.action==="LOWER_MARGIN").length}  color={T.red}   icon="🔻" />
        <KpiCard label="Holds"           value={MOCK_OPTIMIZER.filter(r=>r.action==="HOLD").length}          icon="⏸" />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {MOCK_OPTIMIZER.map((p,i)=>(
          <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${actionColor[p.action]||T.border}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, flexWrap:"wrap" }}>
              <span style={{ color:T.text, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{p.publisher}</span>
              <span style={{ color:actionColor[p.action], fontFamily:"monospace", fontSize:11, background:(actionColor[p.action]||T.border)+"22", padding:"2px 8px", borderRadius:4 }}>{p.action.replace(/_/g," ")}</span>
              <span style={{ color:outcomeColor[p.outcome], fontSize:11 }}>{outcomeLabel[p.outcome]}</span>
            </div>
            <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
              {[["Margin",`${p.current} → ${p.proposed}`],["eCPM",`$${p.ecpm}`],["Avg Bid",`$${p.avg_bid}`],["Fill",p.fill],["Profit",fmt(p.profit)]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <span style={{ color:T.textMuted, fontSize:10, fontFamily:"monospace" }}>{l}</span>
                  <span style={{ color:T.text, fontFamily:"monospace", fontSize:12 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <SectionHeader title="eCPM vs Avg Bid" />
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={MOCK_OPTIMIZER.map(p=>({ name:p.publisher.split(" ")[0], ecpm:p.ecpm, avg_bid:p.avg_bid }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fontSize:11, fill:T.textMuted }} />
            <YAxis tick={{ fontSize:9, fill:T.textMuted }} tickFormatter={v=>`$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:11, color:T.textMuted }} />
            <Bar dataKey="ecpm"    name="eCPM"    fill={T.pll}     radius={[4,4,0,0]} />
            <Bar dataKey="avg_bid" name="Avg Bid" fill={T.attekmi} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Daily Summary Tab ────────────────────────────────────────────────────────
const DailyTab = ({ DATA }) => {
  const dailyMap = {};
  ["PLL","Attekmi","IScream"].forEach(src => {
    DATA[src].hourly.forEach(r => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { date:r.date, pll:0, attekmi:0, iscream:0 };
      if (src==="PLL")     dailyMap[r.date].pll     += r.revenue;
      if (src==="Attekmi") dailyMap[r.date].attekmi += r.revenue;
      if (src==="IScream") dailyMap[r.date].iscream += r.revenue;
    });
  });
  const dailyTrend = Object.values(dailyMap).slice(-14);

  const agg = {
    revenue:     Object.values(DATA).reduce((s,d)=>s+d.mtd.revenue,0),
    profit:      Object.values(DATA).reduce((s,d)=>s+d.mtd.profit,0),
    impressions: Object.values(DATA).reduce((s,d)=>s+d.mtd.impressions,0),
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <SectionHeader title="Daily Summary" sub="MTD snapshots — 09:00 Cyprus time (06:00 UTC)" />
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <SectionHeader title="14-Day Revenue Trend (Stacked)" />
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={dailyTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize:10, fill:T.textMuted }} />
            <YAxis tick={{ fontSize:9, fill:T.textMuted }} tickFormatter={v=>`$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:11, color:T.textMuted }} />
            <Bar dataKey="pll"     name="PLL"     fill={T.pll}     stackId="a" />
            <Bar dataKey="attekmi" name="Attekmi" fill={T.attekmi} stackId="a" />
            <Bar dataKey="iscream" name="IScream" fill={T.iscream} stackId="a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
        <SectionHeader title="MTD Telegram Summary Preview" />
        <pre style={{ background:T.surfaceAlt, borderRadius:8, padding:14, fontFamily:"monospace", fontSize:11, color:T.text, lineHeight:1.8, overflowX:"auto", whiteSpace:"pre-wrap" }}>{`📊 CyanAds MTD Summary
As of ${new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} UTC

PLL
  Revenue:     ${fmt(DATA.PLL.mtd.revenue)}
  Pub Cost:    ${fmt(DATA.PLL.mtd.pub_cost)}
  Limelight:   ${fmt(DATA.PLL.mtd.limelight_fee)}
  Net Profit:  ${fmt(DATA.PLL.mtd.profit)} (${DATA.PLL.mtd.margin_pct}% margin)
  Imps:        ${fmtImps(DATA.PLL.mtd.impressions)}

Attekmi
  Revenue:     ${fmt(DATA.Attekmi.mtd.revenue)}
  Pub Cost:    ${fmt(DATA.Attekmi.mtd.pub_cost)}
  Server Fee:  ${fmt(DATA.Attekmi.mtd.server_fee)}
  Net Profit:  ${fmt(DATA.Attekmi.mtd.profit)} (${DATA.Attekmi.mtd.margin_pct}% margin)
  Imps:        ${fmtImps(DATA.Attekmi.mtd.impressions)}

IScream
  Revenue:     ${fmt(DATA.IScream.mtd.revenue)}
  Pub Cost:    ${fmt(DATA.IScream.mtd.pub_cost)}
  Platform:    ${fmt(DATA.IScream.mtd.platform_cost)}
  Net Profit:  ${fmt(DATA.IScream.mtd.profit)} (${DATA.IScream.mtd.margin_pct}% margin)
  Imps:        ${fmtImps(DATA.IScream.mtd.impressions)}

──────────────────
Total
  Revenue:     ${fmt(agg.revenue)}
  Net Profit:  ${fmt(agg.profit)} (${agg.revenue>0?((agg.profit/agg.revenue)*100).toFixed(1):0}% margin)
  Imps:        ${fmtImps(agg.impressions)}`}</pre>
      </div>
    </div>
  );
};

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────
const AskAiTab = ({ DATA }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const agg = {
    revenue: Object.values(DATA).reduce((s,d)=>s+d.mtd.revenue,0),
    profit:  Object.values(DATA).reduce((s,d)=>s+d.mtd.profit,0),
  };

  const systemPrompt = `You are CyanAds Revenue Intelligence AI with access to live data.

LIVE MTD DATA:
PLL:     rev=${fmt(DATA.PLL.mtd.revenue)}     profit=${fmt(DATA.PLL.mtd.profit)}     margin=${DATA.PLL.mtd.margin_pct}%  imps=${fmtImps(DATA.PLL.mtd.impressions)}
Attekmi: rev=${fmt(DATA.Attekmi.mtd.revenue)} profit=${fmt(DATA.Attekmi.mtd.profit)} margin=${DATA.Attekmi.mtd.margin_pct}% imps=${fmtImps(DATA.Attekmi.mtd.impressions)}
IScream: rev=${fmt(DATA.IScream.mtd.revenue)} profit=${fmt(DATA.IScream.mtd.profit)} margin=${DATA.IScream.mtd.margin_pct}% imps=${fmtImps(DATA.IScream.mtd.impressions)}
Total:   rev=${fmt(agg.revenue)} profit=${fmt(agg.profit)}

Fee structures: PLL limelight_fee=10% gross, Attekmi server_fee=14% gross profit, IScream platform_cost=min($0.18CPM,5% gross).
Features: Hourly monitor (±50%/±$50 threshold), detail reports, campaign auto-duplication (on INCREASE, not IScream), margin optimizer (supervised Phase 1, FLOOR=30% CEILING=70% STEP=10%), daily 9AM summary.
Answer concisely and actionably.`;

  const ask = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg = prompt;
    setPrompt("");
    setLoading(true);
    const newHistory = [...history, { role:"user", text:userMsg }];
    setHistory(newHistory);
    try {
      const messages = newHistory.map(m=>({ role:m.role==="user"?"user":"assistant", content:m.text }));
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:systemPrompt, messages }),
      });
      const data = await resp.json();
      setHistory([...newHistory, { role:"assistant", text:data.content?.[0]?.text||"No response." }]);
    } catch(e) {
      setHistory([...newHistory, { role:"assistant", text:`Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const suggestions = ["Which source has the best margin?","How is PLL performing this month?","Should I activate autonomous margin mode?","Compare IScream vs Attekmi profitability","What's my total profit margin MTD?"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <SectionHeader title="Revenue Intelligence" sub="Powered by Claude — using your live data" />
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16, minHeight:300, display:"flex", flexDirection:"column", gap:10, overflowY:"auto", maxHeight:420 }}>
        {history.length===0 && (
          <div style={{ color:T.textMuted, fontSize:12, lineHeight:1.7 }}>
            💡 Ask anything about your live revenue data.
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
              {suggestions.map((s,i)=>(
                <button key={i} onClick={()=>setPrompt(s)} style={{ background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:16, padding:"4px 10px", color:T.textMuted, fontSize:11, cursor:"pointer", fontFamily:"monospace", transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.target.style.borderColor=T.accent+"66";e.target.style.color=T.accent;}}
                  onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.textMuted;}}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m,i)=>(
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ background:m.role==="user"?T.accent+"22":T.surfaceAlt, border:`1px solid ${m.role==="user"?T.accent+"44":T.border}`, borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px", padding:"9px 13px", maxWidth:"87%", fontSize:12, color:T.text, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ color:T.textMuted, fontSize:11 }}>⏳ Analyzing your data…</div>}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&ask()}
          placeholder="Ask about your revenue data…"
          style={{ flex:1, background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 13px", color:T.text, fontSize:12, fontFamily:"monospace", outline:"none" }}
          onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border} />
        <button onClick={ask} disabled={loading||!prompt.trim()} style={{ background:loading||!prompt.trim()?T.border:T.accent, color:loading||!prompt.trim()?T.textMuted:T.bg, border:"none", borderRadius:8, padding:"9px 16px", cursor:loading||!prompt.trim()?"not-allowed":"pointer", fontWeight:700, fontSize:13, fontFamily:"'Syne',sans-serif" }}>Send</button>
      </div>
    </div>
  );
};

// ─── Tabs Config ──────────────────────────────────────────────────────────────
const TABS = [
  { id:"overview",  label:"Overview",         icon:"◈" },
  { id:"hourly",    label:"Hourly Monitor",   icon:"⏱" },
  { id:"alerts",    label:"Alerts",           icon:"🔔" },
  { id:"optimizer", label:"Margin Optimizer", icon:"📊" },
  { id:"daily",     label:"Daily Summary",    icon:"📅" },
  { id:"ai",        label:"Ask AI",           icon:"✦" },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]   = useState("overview");
  const [now, setNow]   = useState(new Date());
  const { raw, rawLastMonth, loading, lastFetched, error, refresh, fetchLastMonth } = useSheetData();

  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),60000); return ()=>clearInterval(id); },[]);

  // Use real data if available, fall back to mock while loading
  const DATA     = transformData(raw) || MOCK_DATA;
  const DATA_LM  = transformData(rawLastMonth);
  const isLive   = !!raw;

  const tabProps = { DATA, DATA_LM, fetchLastMonth };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg};color:${T.text};font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
      `}</style>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:6, background:T.accent+"22", border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>◈</div>
            <div>
              <div style={{ color:T.text, fontWeight:800, fontSize:15, letterSpacing:"-0.02em" }}>CyanAds</div>
              <div style={{ color:T.textMuted, fontSize:9, fontFamily:"monospace" }}>Revenue Monitor</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {error && <div style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:6, padding:"3px 9px", fontSize:10, color:T.red, fontFamily:"monospace" }}>⚠ {error}</div>}
            <div style={{ background:(isLive?T.green:T.amber)+"22", border:`1px solid ${(isLive?T.green:T.amber)}44`, borderRadius:6, padding:"3px 9px", fontSize:10, color:isLive?T.green:T.amber, fontFamily:"monospace" }}>
              {loading ? "⏳ Loading…" : isLive ? "● LIVE" : "● DEMO"}
            </div>
            {lastFetched && <div style={{ color:T.textMuted, fontSize:10, fontFamily:"monospace" }}>Updated {lastFetched.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>}
            <button onClick={refresh} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"3px 9px", fontSize:10, color:T.textMuted, cursor:"pointer", fontFamily:"monospace" }}>↻ Refresh</button>
            <div style={{ color:T.textMuted, fontSize:10, fontFamily:"monospace" }}>{now.toLocaleString("en-GB",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"})} UTC</div>
          </div>
        </header>

        {/* Tab Nav */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 16px" }}>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {/* Content */}
        <main style={{ flex:1, padding:"18px 16px", maxWidth:1100, width:"100%", margin:"0 auto" }}>
          {tab==="overview"  && <OverviewTab  {...tabProps} />}
          {tab==="hourly"    && <HourlyTab    {...tabProps} />}
          {tab==="alerts"    && <AlertsTab    {...tabProps} />}
          {tab==="optimizer" && <OptimizerTab {...tabProps} />}
          {tab==="daily"     && <DailyTab     {...tabProps} />}
          {tab==="ai"        && <AskAiTab     {...tabProps} />}
        </main>

        {/* Footer */}
        <footer style={{ padding:"10px 18px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <span style={{ color:T.textDim, fontSize:10, fontFamily:"monospace" }}>CyanAds Monitor · GitHub Actions · hourly + 09:00 daily</span>
          <span style={{ color:T.textDim, fontSize:10, fontFamily:"monospace" }}>Thresholds ±50% / ±$50 · Min bundle profit $30 · Dedup 7d</span>
        </footer>
      </div>
    </>
  );
}
