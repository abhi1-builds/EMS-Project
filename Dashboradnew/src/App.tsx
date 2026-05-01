import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const ESP32_IP = import.meta.env.VITE_ESP32_IP ?? "10.31.122.231";
const SENSOR_SOURCE_URL = import.meta.env.VITE_SENSOR_SOURCE_URL ?? "";
const PREDICTION_API_URL = import.meta.env.VITE_PREDICTION_API_URL ?? "";
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 2000);

const THRESHOLDS = {
  temp:     { warn: 35, danger: 40, max: 60 },
  humidity: { warn: 70, danger: 85, max: 100 },
  co: { warn: 0.1, danger: 0.5, max: 1.0 },  // for low ppm values,
  aqi:      { warn: 100, danger: 200, max: 300 },
};

function getStatus(val: number, key: keyof typeof THRESHOLDS) {
  const t = THRESHOLDS[key];
  if (val >= t.danger) return "danger";
  if (val >= t.warn)   return "warn";
  return "good";
}

const STATUS_COLOR = { good: "#10b981", warn: "#f59e0b", danger: "#ef4444" };
const STATUS_GLOW  = { good: "0 0 20px rgba(16,185,129,0.2)", warn: "0 0 20px rgba(245,158,11,0.2)", danger: "0 0 20px rgba(239,68,68,0.2)" };
const STATUS_BG    = { good: "rgba(16,185,129,0.08)", warn: "rgba(245,158,11,0.08)", danger: "rgba(239,68,68,0.08)" };
const STATUS_LABEL = { good: "Normal", warn: "Warning", danger: "Critical" };

const CARDS = [
  {
    key: "temp" as const,
    label: "Temperature",
    unit: "°C",
    accent: "#f87171",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
      </svg>
    ),
  },
  {
    key: "humidity" as const,
    label: "Humidity",
    unit: "%",
    accent: "#34d399",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
  },
  {
    key: "co" as const,
    label: "Carbon Monoxide",
    unit: " ppm",
    accent: "#fbbf24",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M2 12h2M20 12h2M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
  },
  {
    key: "aqi" as const,
    label: "Air Quality",
    unit: " AQI",
    accent: "#a78bfa",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="2" x2="6" y2="4"/>
        <line x1="10" y1="2" x2="10" y2="4"/>
        <line x1="14" y1="2" x2="14" y2="4"/>
      </svg>
    ),
  },
];

function RadialGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = pct * arcLen;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="5"
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        transform="rotate(135 36 36)"
        strokeLinecap="round" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ - filled}`}
        transform="rotate(135 36 36)"
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="36" y="40" textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

type SensorSnapshot = {
  temp: number;
  humidity: number;
  co: number;
  aqi: number;
};

type PredictionResult = {
  coPred: number;
  hazardous: boolean;
  source: "model" | "rule";
};

type SensorPoint = SensorSnapshot & {
  time: string;
};

type ChartTooltipEntry = {
  dataKey: string | number;
  stroke: string;
  name: string;
  value: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeSensorPoint(payload: unknown): SensorSnapshot {
  if (!isRecord(payload)) {
    return { temp: 0, humidity: 0, co: 0, aqi: 0 };
  }

  return {
    temp: parseNumber(payload.temperature ?? payload.temp),
    humidity: parseNumber(payload.humidity ?? payload.hum),
    co: parseNumber(payload.co ?? payload.carbonMonoxide ?? payload.carbon_monoxide),
    aqi: parseNumber(payload.aqi ?? payload.airQualityIndex ?? payload.air_quality_index),
  };
}

function extractLatestPayload(json: unknown): unknown {
  if (Array.isArray(json)) {
    return json.at(-1);
  }

  if (!isRecord(json)) {
    return json;
  }

  if (Array.isArray(json.records)) {
    return json.records.at(-1);
  }

  if (Array.isArray(json.data)) {
    return json.data.at(-1);
  }

  if (isRecord(json.latest)) {
    return json.latest;
  }

  return json;
}

async function fetchSensorReading(): Promise<SensorSnapshot> {
  if (SENSOR_SOURCE_URL) {
    const res = await fetch(SENSOR_SOURCE_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`S3/API source HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizeSensorPoint(extractLatestPayload(json));
  }

  const res = await fetch(`http://${ESP32_IP}`, {
    method: "GET",
    mode: "cors",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`ESP32 HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  return normalizeSensorPoint(json);
}

async function fetchPrediction(point: SensorSnapshot): Promise<PredictionResult> {
  if (PREDICTION_API_URL) {
    try {
      const res = await fetch(PREDICTION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(point),
      });

      if (res.ok) {
        const json: unknown = await res.json();

        if (isRecord(json)) {
          const coPred = parseNumber(
            json.predicted_co ?? json.prediction ?? json.co_prediction ?? json.coPred ?? json.co,
            point.co,
          );

          const hazardRaw = json.hazardous ?? json.is_hazardous ?? json.hazard;
          const hazardous = typeof hazardRaw === "boolean" ? hazardRaw : coPred >= THRESHOLDS.co.warn;

          return { coPred, hazardous, source: "model" };
        }
      }
    } catch {
      // Fall back to threshold rule if model endpoint is temporarily unreachable.
    }
  }

  return {
    coPred: point.co,
    hazardous: point.co >= THRESHOLDS.co.warn,
    source: "rule",
  };
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: 12,
      padding: "10px 14px",
      fontSize: 12,
      minWidth: 140,
    }}>
      <p style={{ color: "#64748b", margin: "0 0 8px", fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.stroke, flexShrink: 0 }} />
          <span style={{ color: "#94a3b8", flex: 1 }}>{p.name}</span>
          <span style={{ color: "#f8fafc", fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [connStatus, setConnStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [data, setData]             = useState<SensorSnapshot>({ temp: 0, humidity: 0, co: 0, aqi: 0 });
  const [history, setHistory]       = useState<SensorPoint[]>([]);
  const [predictedCO, setPredictedCO] = useState(0);
  const [hazardous, setHazardous]     = useState(false);
  const [predictionSource, setPredictionSource] = useState<"model" | "rule">("rule");
  const [lastUpdated, setLastUpdated] = useState("—");
  const [uptime, setUptime]         = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setUptime(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reading = await fetchSensorReading();
        const point = {
          time:     new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          ...reading,
        };
        setData({ temp: point.temp, humidity: point.humidity, co: point.co, aqi: point.aqi });
        setHistory(prev => [...prev.slice(-25), point]);
        const prediction = await fetchPrediction(reading);
        setPredictedCO(prediction.coPred);
        setHazardous(prediction.hazardous);
        setPredictionSource(prediction.source);
        setConnStatus("live");
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setConnStatus("offline");
        const mock = {
          time:     new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          temp:     +(23 + Math.random() * 5).toFixed(1),
          humidity: +(44 + Math.random() * 12).toFixed(0),
          co:       +(0.1 + Math.random() * 0.6).toFixed(2),
          aqi:      +(25 + Math.random() * 20).toFixed(0),
        };
        setData({ temp: mock.temp, humidity: mock.humidity, co: mock.co, aqi: mock.aqi });
        setHistory(prev => [...prev.slice(-25), mock]);
        setPredictedCO(mock.co);
        setHazardous(mock.co >= THRESHOLDS.co.warn);
        setPredictionSource("rule");
        setLastUpdated(new Date().toLocaleTimeString());
      }
    };

    fetchData();
    const iv = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const dotColor =
    connStatus === "live"    ? "#10b981" :
    connStatus === "offline" ? "#f59e0b" : "#64748b";

  const hazardColor = hazardous ? "#ef4444" : "#10b981";
  const sourceLabel = SENSOR_SOURCE_URL ? "AWS S3 source" : `ESP32 @ ${ESP32_IP}`;

  return (
    <div style={{
      background: "#080e1a",
      minHeight: "100vh",
      padding: "24px 20px",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color: "white",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: "16px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                ESP32 Environment Monitor
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
                Real-time air quality & climate tracking
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Uptime */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#1a2540", border: "1px solid #263354",
              borderRadius: 100, padding: "6px 14px", fontSize: 12,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ color: "#64748b" }}>Uptime</span>
              <span style={{ color: "#38bdf8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {fmt(uptime)}
              </span>
            </div>

            {/* Status */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#1a2540", border: "1px solid #263354",
              borderRadius: 100, padding: "6px 14px", fontSize: 12,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: dotColor,
                boxShadow: `0 0 8px ${dotColor}`,
                animation: connStatus === "live" ? "blink 2s infinite" : "none",
              }} />
              <span style={{ color: connStatus === "live" ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                {connStatus === "live" ? "Live" : connStatus === "offline" ? "Offline" : "Connecting…"}
              </span>
            </div>

            {/* IP */}
            <div style={{
              background: "#1a2540", border: "1px solid #263354",
              borderRadius: 100, padding: "6px 14px", fontSize: 12,
              color: "#38bdf8", fontVariantNumeric: "tabular-nums",
            }}>
              {sourceLabel}
            </div>

            {/* Predicted CO */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#1a2540", border: "1px solid #263354",
              borderRadius: 100, padding: "6px 14px", fontSize: 12,
            }}>
              <span style={{ color: "#64748b" }}>Pred CO</span>
              <span style={{ color: "#f8fafc", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {predictedCO.toFixed(2)} ppm
              </span>
            </div>

            {/* Hazard */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `${hazardColor}1A`,
              border: `1px solid ${hazardColor}66`,
              borderRadius: 100, padding: "6px 14px", fontSize: 12,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: hazardColor, boxShadow: `0 0 8px ${hazardColor}` }} />
              <span style={{ color: hazardColor, fontWeight: 700 }}>
                {hazardous ? "Hazardous" : "Safe"}
              </span>
            </div>
          </div>
        </div>

        {/* ── METRIC CARDS ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}>
          {CARDS.map(cfg => {
            const val = data[cfg.key];
            const st  = getStatus(val, cfg.key);
            const pct = Math.min((val / THRESHOLDS[cfg.key].max) * 100, 100);
            return (
              <div key={cfg.key} style={{
                background: "#0f172a",
                border: `1px solid ${STATUS_COLOR[st]}28`,
                borderRadius: 18,
                padding: "22px 22px 18px",
                position: "relative",
                overflow: "hidden",
                boxShadow: `0 2px 20px rgba(0,0,0,0.4), ${STATUS_GLOW[st]}`,
              }}>
                {/* bg glow circle */}
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 120, height: 120, borderRadius: "50%",
                  background: `${cfg.accent}06`,
                  pointerEvents: "none",
                }} />

                {/* top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <p style={{
                      margin: 0, fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.1em", color: "#475569", textTransform: "uppercase",
                    }}>
                      {cfg.label}
                    </p>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      marginTop: 5, padding: "3px 9px",
                      borderRadius: 100,
                      background: STATUS_BG[st],
                      border: `1px solid ${STATUS_COLOR[st]}35`,
                      fontSize: 10, fontWeight: 700, color: STATUS_COLOR[st],
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[st] }} />
                      {STATUS_LABEL[st]}
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${cfg.accent}12`,
                    border: `1px solid ${cfg.accent}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: cfg.accent, flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>
                </div>

                {/* value + gauge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: "#f8fafc", letterSpacing: "-2px" }}>
                      {val}
                    </span>
                    <span style={{ fontSize: 15, color: "#475569", fontWeight: 500 }}>{cfg.unit}</span>
                  </div>
                  <RadialGauge value={val} max={THRESHOLDS[cfg.key].max} color={cfg.accent} />
                </div>

                {/* progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#334155" }}>0</span>
                    <span style={{ fontSize: 10, color: "#334155" }}>Max {THRESHOLDS[cfg.key].max}{cfg.unit}</span>
                  </div>
                  <div style={{ height: 4, background: "#1e293b", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${cfg.accent}60, ${cfg.accent})`,
                      borderRadius: 100,
                      transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: `0 0 8px ${cfg.accent}50`,
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CHART ── */}
        <div style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 18,
          padding: "24px 22px",
          boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
                Live Sensor Trends
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#334155" }}>
                Updated: {lastUpdated} · polling every {Math.round(POLL_INTERVAL_MS / 1000)}s
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Temp",     color: "#f87171" },
                { label: "Humidity", color: "#34d399" },
                { label: "AQI",      color: "#a78bfa" },
                { label: "CO",       color: "#fbbf24" },
              ].map(l => (
                <div key={l.label} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#1a2540", border: "1px solid #263354",
                  borderRadius: 100, padding: "4px 10px", fontSize: 11,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: l.color, boxShadow: `0 0 5px ${l.color}80` }} />
                  <span style={{ color: "#94a3b8" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ Fixed: minHeight + width added to prevent recharts warning */}
          <div style={{ width: "100%", minHeight: 320, height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  {[
                    { id: "tempG", c: "#f87171" },
                    { id: "humG",  c: "#34d399" },
                    { id: "aqiG",  c: "#a78bfa" },
                    { id: "coG",   c: "#fbbf24" },
                  ].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={g.c} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={g.c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
                <XAxis dataKey="time" stroke="#1e293b" tick={{ fill: "#334155", fontSize: 10 }} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#1e293b" tick={{ fill: "#334155", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area name="Temp (°C)"    type="monotone" dataKey="temp"     stroke="#f87171" strokeWidth={2} fill="url(#tempG)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#f87171" }} />
                <Area name="Humidity (%)" type="monotone" dataKey="humidity" stroke="#34d399" strokeWidth={2} fill="url(#humG)"  dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#34d399" }} />
                <Area name="AQI"          type="monotone" dataKey="aqi"      stroke="#a78bfa" strokeWidth={2} fill="url(#aqiG)"  dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#a78bfa" }} />
                <Area name="CO (ppm)"     type="monotone" dataKey="co"       stroke="#fbbf24" strokeWidth={2} fill="url(#coG)"   dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#fbbf24" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 18 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
          <span style={{ fontSize: 11, color: "#263354" }}>
            {sourceLabel} · {Math.round(POLL_INTERVAL_MS / 1000)}s polling · prediction: {predictionSource === "model" ? "SageMaker model" : "threshold rule"} · {connStatus === "offline" ? "showing mock data" : "live sensor data"}
          </span>
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}   