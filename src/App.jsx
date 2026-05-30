import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from "recharts";

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
  accentDim:  "#0088aa",
  green:      "#22c55e",
  red:        "#ef4444",
  amber:      "#f59e0b",
  pll:        "#00d4ff",
  attekmi:    "#a78bfa",
  iscream:    "#fb923c",
};

const API_URL = "https://script.google.com/macros/s/AKfycbzmfXzo3866YMgbN8s36HYmADcGM-n4_0VQMM1baDcJrOpgr61NsLXMYf_fw6kvKiS7iA/exec?key=cyanads2026";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const generateHourlyData = (baseRev, variance, hours = 48) => {
  const data = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i--) {
    const h = new Date(now);
    h.setHours(h.getHours() - i, 0, 0, 0);
    const rev = Math.max(0, baseRev + (Math.random() - 0.45) * variance);
    const cost = rev * (0.35 + Math.random() * 0.1);
    const profit = rev - cost - rev * 0.1;
    data.push({
      ts: h.toISOString(),
      label: `${h.getMonth()+1}/${h.getDate()} ${String(h.getHours()).padStart(2,'0')}:00`,
      revenue: +rev.toFixed(2),
      cost: +cost.toFixed(2),
      profit: +profit.toFixed(2),
      impressions: Math.floor(rev * 1200 + Math.random() * 5000),
    });
  }
  return data;
};
const MOCK_DATA = {
  PLL: {
    color: T.pll,
    hourly: generateHourlyData(62, 30),
    mtd: { revenue: 14820.44, pub_cost: 9110.20, limelight_fee: 1482.04, ad_serving_fee: 0, profit: 4228.20, margin_pct: 28.5, impressions: 18420000 },
  },
  Attekmi: {
    color: T.attekmi,
    hourly: generateHourlyData(38, 20),
    mtd: { revenue: 8940.10, pub_cost: 5800.30, server_fee: 441.93, profit: 2697.87, margin_pct: 30.2, impressions: 11200000 },
  },
  IScream: {
    color: T.iscream,
    hourly: generateHourlyData(25, 15),
    mtd: { revenue: 5620.80, pub_cost: 3410.50, platform_cost: 224.83, cost_method: "CPM", profit: 1985.47, margin_pct: 35.3, impressions: 7840000 },
  },
};

const MOCK_BUNDLES = [
  { bundle: "com.gameapp.adventure", revenue: 420.50, profit: 130.20, pct_change: 82, impressions: 520000, supply: "PubMatic" },
  { bundle: "com.news.daily", revenue: 310.80, profit: 95.40, pct_change: 61, impressions: 390000, supply: "OpenX" },
  { bundle: "com.fitness.tracker", revenue: 280.20, profit: 88.60, pct_change: 55, impressions: 340000, supply: "Magnite" },
  { bundle: "com.weather.live", revenue: 190.10, profit: 60.30, pct_change: 47, impressions: 230000, supply: "PubMatic" },
  { bundle: "com.social.moments", revenue: 160.90, profit: 50.10, pct_change: 39, impressions: 200000, supply: "AppNexus" },
];

const MOCK_OPTIMIZER = [
  { publisher: "PubMatic SSP", action: "RAISE_MARGIN", current: "35%", proposed: "45%", ecpm: 2.84, avg_bid: 3.42, fill: "0.0182%", profit: 48.20, outcome: "OUTCOME_POSITIVE" },
  { publisher: "OpenX DSP", action: "HOLD", current: "40%", proposed: "40%", ecpm: 3.10, avg_bid: 3.08, fill: "0.0244%", profit: 32.10, outcome: "PROPOSED" },
  { publisher: "Magnite", action: "LOWER_MARGIN", current: "50%", proposed: "40%", ecpm: 1.20, avg_bid: 2.80, fill: "0.0031%", profit: 18.40, outcome: "OUTCOME_NEGATIVE" },
];

const MOCK_ALERTS = [
  { ts: "2026-05-29 11:05", source: "PLL", type: "INCREASE", dollar: 72.40, pct: 84.2, bundle: "com.gameapp.adventure" },
  { ts: "2026-05-29 08:05", source: "Attekmi", type: "DROP", dollar: -55.20, pct: -62.1, bundle: "com.news.daily" },
  { ts: "2026-05-28 22:05", source: "IScream", type: "INCREASE", dollar: 51.80, pct: 70.3, bundle: "com.fitness.tracker" },
  { ts: "2026-05-28 17:05", source: "PLL", type: "DROP", dollar: -80.10, pct: -78.4, bundle: "com.weather.live" },
];

// ─── Data Fetching ────────────────────────────────────────────────────────────
function useSheetData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch (e) {
      console.error("Data fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, loading, lastFetched, refresh: fetchData };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
const fmt = (v, decimals = 2) => v == null ? "—" : `$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
const fmtPct = (v) => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtImps = (v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v);
const col = (v) => v >= 0 ? T.green : T.red;

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: T.textMuted, marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.name === "impressions" ? fmtImps(p.value) : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color: cardColor, icon }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
    padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4,
    transition: "border-color 0.2s",
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi}
    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
  >
    <div style={{ color: T.textMuted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>{icon} {label}</div>
    <div style={{ color: cardColor || T.text, fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif", lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ color: T.textMuted, fontSize: 11 }}>{sub}</div>}
  </div>
);

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <h2 style={{ color: T.text, fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
    {sub && <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── Source Badge ──────────────────────────────────────────────────────────────
const SourceBadge = ({ source }) => {
  const cols = { PLL: T.pll, Attekmi: T.attekmi, IScream: T.iscream };
  return (
    <span style={{
      background: (cols[source] || T.accent) + "22",
      color: cols[source] || T.accent,
      border: `1px solid ${(cols[source] || T.accent)}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace", fontWeight: 600,
    }}>{source}</span>
  );
};

// ─── Tab Bar ───────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: 2, borderBottom: `1px solid ${T.border}`,
    overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
  }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "10px 14px", fontSize: 12, fontFamily: "'Syne', sans-serif",
        color: active === t.id ? T.accent : T.textMuted,
        borderBottom: `2px solid ${active === t.id ? T.accent : "transparent"}`,
        marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.15s",
        letterSpacing: "0.01em",
      }}>{t.icon} {t.label}</button>
    ))}
  </div>
);

// ─── Source Selector ──────────────────────────────────────────────────────────
const SourceSelector = ({ sources, active, onChange }) => (
  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
    {sources.map(s => {
      const isActive = active.includes(s);
      const c = { PLL: T.pll, Attekmi: T.attekmi, IScream: T.iscream, All: T.accent }[s] || T.accent;
      return (
        <button key={s} onClick={() => onChange(s)} style={{
          background: isActive ? c + "22" : "transparent", color: isActive ? c : T.textMuted,
          border: `1px solid ${isActive ? c + "66" : T.border}`,
          borderRadius: 6, padding: "4px 10px", cursor: "pointer",
          fontSize: 11, fontFamily: "monospace", fontWeight: 600, transition: "all 0.15s",
        }}>{s}</button>
      );
    })}
  </div>
);

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = () => {
  const [range, setRange] = useState(24);
  const [activeSources, setActiveSources] = useState(["PLL", "Attekmi", "IScream"]);
  const toggleSource = (s) => setActiveSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const mergedHourly = MOCK_DATA.PLL.hourly.slice(-range).map((_, i) => {
    const result = { label: MOCK_DATA.PLL.hourly.slice(-range)[i].label };
    if (activeSources.includes("PLL")) result.pll_rev = MOCK_DATA.PLL.hourly.slice(-range)[i].revenue;
    if (activeSources.includes("Attekmi")) result.att_rev = MOCK_DATA.Attekmi.hourly.slice(-range)[i].revenue;
    if (activeSources.includes("IScream")) result.isc_rev = MOCK_DATA.IScream.hourly.slice(-range)[i].revenue;
    return result;
  });

  const agg = {
    revenue: Object.values(MOCK_DATA).reduce((s, d) => s + d.mtd.revenue, 0),
    profit: Object.values(MOCK_DATA).reduce((s, d) => s + d.mtd.profit, 0),
    impressions: Object.values(MOCK_DATA).reduce((s, d) => s + d.mtd.impressions, 0),
  };
  agg.margin = agg.profit / agg.revenue * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <SectionHeader title="Month-to-Date Summary" sub={`As of ${new Date().toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })} UTC`} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          <KpiCard label="Total Revenue" value={fmt(agg.revenue, 0)} sub="MTD" color={T.accent} icon="💰" />
          <KpiCard label="Net Profit" value={fmt(agg.profit, 0)} sub={`${agg.margin.toFixed(1)}% margin`} color={T.green} icon="📈" />
          <KpiCard label="Impressions" value={fmtImps(agg.impressions)} sub="MTD" icon="👁" />
          <KpiCard label="PLL Revenue" value={fmt(MOCK_DATA.PLL.mtd.revenue, 0)} sub={`${MOCK_DATA.PLL.mtd.margin_pct}% margin`} color={T.pll} icon="⬟" />
          <KpiCard label="Attekmi Rev" value={fmt(MOCK_DATA.Attekmi.mtd.revenue, 0)} sub={`${MOCK_DATA.Attekmi.mtd.margin_pct}% margin`} color={T.attekmi} icon="⬡" />
          <KpiCard label="IScream Rev" value={fmt(MOCK_DATA.IScream.mtd.revenue, 0)} sub={`${MOCK_DATA.IScream.mtd.margin_pct}% margin`} color={T.iscream} icon="⬢" />
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <SectionHeader title="Hourly Revenue" sub="Demand payout per source" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SourceSelector sources={["PLL","Attekmi","IScream"]} active={activeSources} onChange={toggleSource} />
            <div style={{ display: "flex", gap: 4 }}>
              {[12,24,48].map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  background: range===r ? T.accent+"22" : "transparent", color: range===r ? T.accent : T.textMuted,
                  border: `1px solid ${range===r ? T.accent+"66" : T.border}`, borderRadius: 4,
                  padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: "monospace"
                }}>{r}h</button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={mergedHourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: T.textMuted }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: T.textMuted }} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            {activeSources.includes("PLL") && <Line type="monotone" dataKey="pll_rev" name="PLL" stroke={T.pll} strokeWidth={2} dot={false} />}
            {activeSources.includes("Attekmi") && <Line type="monotone" dataKey="att_rev" name="Attekmi" stroke={T.attekmi} strokeWidth={2} dot={false} />}
            {activeSources.includes("IScream") && <Line type="monotone" dataKey="isc_rev" name="IScream" stroke={T.iscream} strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 12 }}>
        {Object.entries(MOCK_DATA).map(([src, d]) => {
          const rows = [
            ["Revenue", d.mtd.revenue, T.text],
            ["Pub Cost", -d.mtd.pub_cost, T.textMuted],
            src === "PLL" && ["Limelight Fee (10%)", -d.mtd.limelight_fee, T.textMuted],
            src === "Attekmi" && ["Server Fee (14%)", -d.mtd.server_fee, T.textMuted],
            src === "IScream" && [`Platform Cost (${d.mtd.cost_method})`, -d.mtd.platform_cost, T.textMuted],
            ["Net Profit", d.mtd.profit, T.green],
          ].filter(Boolean);
          return (
            <div key={src} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <SourceBadge source={src} />
                <span style={{ color: T.textMuted, fontSize: 11, fontFamily: "monospace" }}>{d.mtd.margin_pct}% margin</span>
              </div>
              {rows.map(([label, val, c]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: `1px solid ${label === "Net Profit" ? "transparent" : T.border}`, padding: "7px 0" }}>
                  <span style={{ color: T.textMuted }}>{label}</span>
                  <span style={{ color: c, fontFamily: "monospace", fontWeight: label === "Net Profit" ? 700 : 400 }}>{val < 0 ? `-${fmt(Math.abs(val))}` : fmt(val)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Hourly Monitor Tab ───────────────────────────────────────────────────────
const HourlyTab = () => {
  const [source, setSource] = useState("PLL");
  const [metric, setMetric] = useState("revenue");
  const d = MOCK_DATA[source];
  const last = d.hourly[d.hourly.length - 1];
  const prev = d.hourly[d.hourly.length - 2];
  const change = last.revenue - prev.revenue;
  const changePct = (change / prev.revenue) * 100;
  const alertTriggered = Math.abs(changePct) >= 50 || Math.abs(change) >= 50;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <SectionHeader title="Hourly Monitor" sub="Threshold: ±50% or ±$50 triggers alert + detail report" />
        <SourceSelector sources={["PLL","Attekmi","IScream"]} active={[source]} onChange={setSource} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        <KpiCard label="Last Hour Rev" value={fmt(last.revenue)} color={T.accent} icon="⏱" />
        <KpiCard label="Hour Change" value={`${change >= 0 ? "+" : ""}${fmt(change)}`} sub={fmtPct(changePct)} color={col(change)} icon={change >= 0 ? "🔺" : "🔻"} />
        <KpiCard label="Alert Status" value={alertTriggered ? "TRIGGERED" : "NORMAL"} color={alertTriggered ? T.red : T.green} icon={alertTriggered ? "🚨" : "✅"} />
        <KpiCard label="Impressions" value={fmtImps(last.impressions)} sub="this hour" icon="👁" />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ color: T.text, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>{source} — 48h Trend</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["revenue","profit","impressions"].map(m => (
              <button key={m} onClick={() => setMetric(m)} style={{
                background: metric === m ? d.color + "22" : "transparent", color: metric === m ? d.color : T.textMuted,
                border: `1px solid ${metric === m ? d.color + "66" : T.border}`, borderRadius: 4,
                padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", textTransform: "capitalize"
              }}>{m}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.hourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={d.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={d.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: T.textMuted }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: T.textMuted }} tickFormatter={v => metric === "impressions" ? fmtImps(v) : `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={prev[metric]} stroke={T.amber} strokeDasharray="4 4" />
            <Area type="monotone" dataKey={metric} stroke={d.color} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <SectionHeader title="Last 12 Hours" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Hour","Revenue","Profit","Impressions","Δ vs Prev"].map(h => (
                  <th key={h} style={{ color: T.textMuted, textAlign: h === "Hour" ? "left" : "right", padding: "6px 10px", fontFamily: "monospace", fontWeight: 400, fontSize: 10, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.hourly.slice(-12).reverse().map((row, i) => {
                const prevRow = d.hourly[d.hourly.length - 12 + (11 - i) - 1];
                const chg = prevRow ? row.revenue - prevRow.revenue : 0;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i === 0 ? T.accent + "08" : "transparent" }}>
                    <td style={{ color: i === 0 ? T.accent : T.text, padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{row.label}</td>
                    <td style={{ color: T.text, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmt(row.revenue)}</td>
                    <td style={{ color: row.profit >= 0 ? T.green : T.red, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmt(row.profit)}</td>
                    <td style={{ color: T.textMuted, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmtImps(row.impressions)}</td>
                    <td style={{ color: col(chg), textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{chg >= 0 ? "+" : ""}{fmt(chg)}</td>
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

// ─── Detail Report Tab ────────────────────────────────────────────────────────
const DetailTab = () => {
  const [sortBy, setSortBy] = useState("revenue");
  const [search, setSearch] = useState("");
  const sorted = [...MOCK_BUNDLES]
    .filter(r => !search || r.bundle.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "revenue" ? b.revenue - a.revenue : b.pct_change - a.pct_change);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Bundle Detail Report" sub="Top bundles — alert hour vs previous hour, sorted by revenue change" />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="🔍 Search bundle…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, padding: "7px 12px", fontSize: 12, fontFamily: "monospace", outline: "none", flex: 1, minWidth: 180 }} />
        {["revenue","change"].map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            background: sortBy === s ? T.accent+"22" : "transparent", color: sortBy === s ? T.accent : T.textMuted,
            border: `1px solid ${sortBy === s ? T.accent+"66" : T.border}`, borderRadius: 5,
            padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace"
          }}>Sort: {s}</button>
        ))}
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <SectionHeader title="Top Bundle Revenue" sub="Alert hour" />
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={sorted.slice(0,5)} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: T.textMuted }} tickFormatter={v => `$${v}`} />
            <YAxis type="category" dataKey="bundle" width={150} tick={{ fontSize: 10, fill: T.textMuted }} tickFormatter={v => v.split(".").pop()} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill={T.accent} radius={[0,4,4,0]} />
            <Bar dataKey="profit" name="Profit" fill={T.green} radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Bundle","Revenue","Profit","Chg%","Impressions","Supply"].map(h => (
                  <th key={h} style={{ color: T.textMuted, textAlign: ["Bundle","Supply"].includes(h) ? "left" : "right", padding: "6px 10px", fontFamily: "monospace", fontWeight: 400, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ color: T.text, padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{row.bundle}</td>
                  <td style={{ color: T.accent, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmt(row.revenue)}</td>
                  <td style={{ color: T.green, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmt(row.profit)}</td>
                  <td style={{ color: T.green, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>+{row.pct_change}%</td>
                  <td style={{ color: T.textMuted, textAlign: "right", padding: "8px 10px", fontFamily: "monospace" }}>{fmtImps(row.impressions)}</td>
                  <td style={{ color: T.textMuted, padding: "8px 10px", fontFamily: "monospace" }}>{row.supply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Alerts Tab ───────────────────────────────────────────────────────────────
const AlertsTab = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <SectionHeader title="Alert History" sub="Revenue threshold breaches — ±50% or ±$50" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
      <KpiCard label="Total Alerts" value={MOCK_ALERTS.length} icon="🔔" />
      <KpiCard label="Increases" value={MOCK_ALERTS.filter(a=>a.type==="INCREASE").length} color={T.green} icon="🔺" />
      <KpiCard label="Drops" value={MOCK_ALERTS.filter(a=>a.type==="DROP").length} color={T.red} icon="🔻" />
      <KpiCard label="Campaigns Created" value={2} color={T.accent} icon="🤖" />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {MOCK_ALERTS.map((a, i) => (
        <div key={i} style={{
          background: T.surface, border: `1px solid ${a.type==="INCREASE" ? T.green+"33" : T.red+"33"}`,
          borderLeft: `3px solid ${a.type==="INCREASE" ? T.green : T.red}`,
          borderRadius: 10, padding: "13px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>{a.type === "INCREASE" ? "🔺" : "🔻"}</span>
              <SourceBadge source={a.source} />
              <span style={{ color: a.type==="INCREASE" ? T.green : T.red, fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>
                {a.dollar >= 0 ? "+" : ""}{fmt(a.dollar)} / {a.pct >= 0 ? "+" : ""}{a.pct.toFixed(1)}%
              </span>
            </div>
            <div style={{ color: T.textMuted, fontSize: 11, fontFamily: "monospace" }}>{a.ts} UTC · {a.bundle}</div>
          </div>
          {a.type === "INCREASE" && a.source !== "IScream" && (
            <span style={{ background: T.accent+"22", color: T.accent, border: `1px solid ${T.accent}44`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontFamily: "monospace" }}>🤖 Campaign duplicated</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─── Margin Optimizer Tab ─────────────────────────────────────────────────────
const OptimizerTab = () => {
  const actionColor = { RAISE_MARGIN: T.green, LOWER_MARGIN: T.red, HOLD: T.textMuted };
  const outcomeColor = { OUTCOME_POSITIVE: T.green, OUTCOME_NEGATIVE: T.red, OUTCOME_NEUTRAL: T.amber, PROPOSED: T.accent };
  const outcomeLabel = { OUTCOME_POSITIVE: "✅ Positive", OUTCOME_NEGATIVE: "❌ Negative", OUTCOME_NEUTRAL: "⚪ Neutral", PROPOSED: "⏳ Proposed" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Margin Optimizer" sub="Phase 1 — supervised proposals only, no autonomous changes" />
      <div style={{ background: T.amber+"11", border: `1px solid ${T.amber}33`, borderRadius: 8, padding: "10px 14px", color: T.amber, fontSize: 12 }}>
        ⚠️ <strong>Supervised Mode</strong> — Proposals require manual review. MARGIN_FLOOR=30%, CEILING=70%, STEP=10%.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        <KpiCard label="Evaluated" value={MOCK_OPTIMIZER.length} icon="📊" />
        <KpiCard label="Raise Proposals" value={MOCK_OPTIMIZER.filter(r=>r.action==="RAISE_MARGIN").length} color={T.green} icon="🔺" />
        <KpiCard label="Lower Proposals" value={MOCK_OPTIMIZER.filter(r=>r.action==="LOWER_MARGIN").length} color={T.red} icon="🔻" />
        <KpiCard label="Holds" value={MOCK_OPTIMIZER.filter(r=>r.action==="HOLD").length} icon="⏸" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MOCK_OPTIMIZER.map((p, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${actionColor[p.action]||T.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ color: T.text, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{p.publisher}</span>
              <span style={{ color: actionColor[p.action], fontFamily: "monospace", fontSize: 11, background: (actionColor[p.action]||T.border)+"22", padding: "2px 8px", borderRadius: 4 }}>{p.action.replace(/_/g," ")}</span>
              <span style={{ color: outcomeColor[p.outcome], fontSize: 11 }}>{outcomeLabel[p.outcome]}</span>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {[["Margin", `${p.current} → ${p.proposed}`],["eCPM",`$${p.ecpm}`],["Avg Bid",`$${p.avg_bid}`],["Fill",p.fill],["Profit",fmt(p.profit)]].map(([l,v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: T.textMuted, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.06em" }}>{l}</span>
                  <span style={{ color: T.text, fontFamily: "monospace", fontSize: 12 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <SectionHeader title="eCPM vs Avg Bid" sub="Per publisher" />
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={MOCK_OPTIMIZER.map(p => ({ name: p.publisher.split(" ")[0], ecpm: p.ecpm, avg_bid: p.avg_bid }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: T.textMuted }} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: T.textMuted }} />
            <Bar dataKey="ecpm" name="eCPM" fill={T.pll} radius={[4,4,0,0]} />
            <Bar dataKey="avg_bid" name="Avg Bid" fill={T.attekmi} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Daily Summary Tab ────────────────────────────────────────────────────────
const DailyTab = () => {
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return { date: `${d.getMonth()+1}/${d.getDate()}`, pll: 400+Math.random()*200, attekmi: 250+Math.random()*120, iscream: 150+Math.random()*80 };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHeader title="Daily Summary" sub="MTD snapshots logged at 09:00 Cyprus time (06:00 UTC)" />
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <SectionHeader title="14-Day Revenue Trend (Stacked)" />
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={dailyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.textMuted }} />
            <YAxis tick={{ fontSize: 9, fill: T.textMuted }} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: T.textMuted }} />
            <Bar dataKey="pll" name="PLL" fill={T.pll} stackId="a" />
            <Bar dataKey="attekmi" name="Attekmi" fill={T.attekmi} stackId="a" />
            <Bar dataKey="iscream" name="IScream" fill={T.iscream} stackId="a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <SectionHeader title="Today's Telegram Summary Preview" />
        <pre style={{ background: T.surfaceAlt, borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 11, color: T.text, lineHeight: 1.8, overflowX: "auto", whiteSpace: "pre-wrap" }}>{`📊 CyanAds MTD Summary — May 2026
As of 29 May 2026, 09:00 Cyprus

PLL
  Revenue:          $14,820.44
  Pub Cost:         $9,110.20
  Limelight Fee:    $1,482.04
  Ad Serving Fee:   $0.00
  Net Profit:       $4,228.20 (28.5% margin)
  Imps:             18,420,000

Attekmi
  Revenue:          $8,940.10
  Pub Cost:         $5,800.30
  Server Fee (14%): $441.93
  Net Profit:       $2,697.87 (30.2% margin)
  Imps:             11,200,000

IScream
  Revenue:          $5,620.80
  Pub Cost:         $3,410.50
  Platform Cost (CPM): $224.83
  Net Profit:       $1,985.47 (35.3% margin)
  Imps:             7,840,000

──────────────────
Total
  Revenue:          $29,381.34
  Net Profit:       $8,911.54 (30.3% margin)
  Imps:             37,460,000`}</pre>
      </div>
    </div>
  );
};

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────
const AskAiTab = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const systemPrompt = `You are CyanAds Revenue Intelligence AI. Expert in this ad monitoring system:

Sources: PLL (demand-side, limelight_fee=10% gross), Attekmi (server_fee=14% gross profit), IScream (platform_cost=min($0.18CPM, 5% gross)).
Features: Hourly monitor (±50% or ±$50 threshold), detail reports, campaign auto-duplication (paused for review), margin optimizer (supervised Phase 1), daily 9AM summary.
MTD May 2026: PLL rev=$14,820 profit=$4,228 margin=28.5% imps=18.4M, Attekmi rev=$8,940 profit=$2,698 margin=30.2% imps=11.2M, IScream rev=$5,621 profit=$1,985 margin=35.3% imps=7.8M. Total rev=$29,381 profit=$8,912 margin=30.3%.
Recent alerts: PLL INCREASE +$72.40/+84.2% (com.gameapp.adventure), Attekmi DROP -$55.20/-62.1%.
Margin optimizer: PubMatic RAISE 35%→45% (eCPM $2.84 < avg bid $3.42), Magnite LOWER 50%→40% (fill 0.003%).
Answer concisely and actionably. Focus on revenue insights, anomalies, recommendations.`;

  const ask = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg = prompt;
    setPrompt("");
    setLoading(true);
    const newHistory = [...history, { role: "user", text: userMsg }];
    setHistory(newHistory);
    try {
      const messages = newHistory.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
      });
      const data = await resp.json();
      const reply = data.content?.[0]?.text || "No response.";
      setHistory([...newHistory, { role: "assistant", text: reply }]);
    } catch (e) {
      setHistory([...newHistory, { role: "assistant", text: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  const suggestions = ["Which source has the best margin this month?","Explain the PLL increase alert","Should I activate autonomous margin mode?","Which bundles to prioritize for duplication?","IScream vs PLL profitability comparison"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionHeader title="Revenue Intelligence" sub="Ask anything about your ad data — powered by Claude" />
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, minHeight: 320, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 400 }}>
        {history.length === 0 && (
          <div style={{ color: T.textMuted, fontSize: 12, lineHeight: 1.7 }}>
            💡 Ask about revenue trends, alert explanations, margin recommendations, or campaign performance.
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setPrompt(s)} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 16, padding: "4px 10px", color: T.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.target.style.borderColor = T.accent+"66"; e.target.style.color = T.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textMuted; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ background: m.role === "user" ? T.accent+"22" : T.surfaceAlt, border: `1px solid ${m.role === "user" ? T.accent+"44" : T.border}`, borderRadius: m.role === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px", padding: "9px 13px", maxWidth: "87%", fontSize: 12, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ color: T.textMuted, fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}><span>⏳</span> Analyzing revenue data…</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && ask()}
          placeholder="Ask about your revenue data…"
          style={{ flex: 1, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 13px", color: T.text, fontSize: 12, fontFamily: "monospace", outline: "none" }}
          onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
        <button onClick={ask} disabled={loading || !prompt.trim()} style={{ background: loading || !prompt.trim() ? T.border : T.accent, color: loading || !prompt.trim() ? T.textMuted : T.bg, border: "none", borderRadius: 8, padding: "9px 16px", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'Syne', sans-serif", transition: "all 0.15s" }}>Send</button>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview",         icon: "◈" },
  { id: "hourly",     label: "Hourly Monitor",   icon: "⏱" },
  { id: "detail",     label: "Detail Report",    icon: "📦" },
  { id: "alerts",     label: "Alerts",           icon: "🔔" },
  { id: "optimizer",  label: "Margin Optimizer", icon: "📊" },
  { id: "daily",      label: "Daily Summary",    icon: "📅" },
  { id: "ai",         label: "Ask AI",           icon: "✦" },
];

const TAB_COMPONENTS = { overview: OverviewTab, hourly: HourlyTab, detail: DetailTab, alerts: AlertsTab, optimizer: OptimizerTab, daily: DailyTab, ai: AskAiTab };

export default function App() {
  const [tab, setTab] = useState("overview");
  const [now, setNow] = useState(new Date());
  const { data, loading, lastFetched, refresh } = useSheetData();
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);
  const TabContent = TAB_COMPONENTS[tab];

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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "11px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: T.accent+"22", border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◈</div>
            <div>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>CyanAds</div>
              <div style={{ color: T.textMuted, fontSize: 9, fontFamily: "monospace" }}>Revenue Monitor</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: T.green+"22", border: `1px solid ${T.green}44`, borderRadius: 6, padding: "3px 9px", fontSize: 10, color: T.green, fontFamily: "monospace" }}>● LIVE</div>
            <div style={{ color: T.textMuted, fontSize: 10, fontFamily: "monospace" }}>{now.toLocaleString("en-GB",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"})} UTC</div>
          </div>
        </header>
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 16px" }}>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <main style={{ flex: 1, padding: "18px 16px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
          <TabContent />
        </main>
        <footer style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span style={{ color: T.textDim, fontSize: 10, fontFamily: "monospace" }}>CyanAds Monitor · GitHub Actions · hourly + 09:00 daily</span>
          <span style={{ color: T.textDim, fontSize: 10, fontFamily: "monospace" }}>Thresholds ±50% / ±$50 · Min bundle profit $30 · Dedup 7d</span>
        </footer>
      </div>
    </>
  );
}
