import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
  } from "recharts";
  
  function detectChartConfig(results) {
    if (!results || results.length === 0) return null;
  
    const keys = Object.keys(results[0]);
    if (keys.length < 2) return null;
  
    const numericKeys = keys.filter((key) =>
      results.every((row) => typeof row[key] === "number")
    );
    const nonNumericKeys = keys.filter((key) => !numericKeys.includes(key));
  
    if (numericKeys.length === 0 || nonNumericKeys.length === 0) return null;
  
    const xKey = nonNumericKeys[0];
    const yKey = numericKeys[0];
  
    // ← NEW: if every numeric value is identical, chart is useless
    const values = results.map((r) => r[yKey]);
    const allSame = values.every((v) => v === values[0]);
    if (allSame) return { type: "flat", xKey, yKey };
  
    if (
      xKey.toLowerCase().includes("month") ||
      xKey.toLowerCase().includes("date") ||
      xKey.toLowerCase().includes("week") ||
      xKey.toLowerCase().includes("day")
    ) {
      return { type: "line", xKey, yKey };
    }
  
    // pie only for ≤5 rows AND values are meaningfully different
    if (results.length <= 5) {
      return { type: "pie", xKey, yKey };
    }
  
    return { type: "bar", xKey, yKey };
  }

  const CHART_COLORS = {
    bar:      "#7f77dd",
    barHover: "#a09ae8",
    line:     "#4a9eff",
    grid:     "#1a1e2e",
    axis:     "#4a5a7a",
    tooltip: {
      bg:     "#0e1017",
      border: "#2a2d3a",
      text:   "#c8d0e8",
    },
  };
  
  const PIE_PALETTE = [
    "#7f77dd", "#4a9eff", "#4adb8a", "#db9a4a", "#db4adb",
  ];
  
  const tooltipStyle = {
    contentStyle: {
      background:   CHART_COLORS.tooltip.bg,
      border:       `1px solid ${CHART_COLORS.tooltip.border}`,
      borderRadius: 8,
      fontSize:     12,
      color:        CHART_COLORS.tooltip.text,
      fontFamily:   "monospace",
    },
    labelStyle:   { color: "#8090b0", marginBottom: 4 },
    cursor:       { fill: "#ffffff08" },
  };
  
  // truncate long x-axis labels
  const renderLabel = (value) =>
    typeof value === "string" && value.length > 14
      ? value.slice(0, 13) + "…"
      : value;
  
      export default function ResultChart({ results }) {
        const config = detectChartConfig(results);
      
        if (!config) return null;
      
        const { type, xKey, yKey } = config;
      
        // ← handle flat/useless chart case
        if (type === "flat") {
            return (
              <div style={{
                width: "100%", padding: "24px 16px",
                background: "#080b12", border: "1px solid #1e2230",
                borderRadius: 12, textAlign: "center",
              }}>
                <p style={{
                  margin: "0 0 6px", fontSize: 11, color: "#4a5a7a",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "monospace", fontWeight: 600,
                }}>
                  Chart View
                </p>
          
                {/* ↓ REPLACE FROM HERE */}
                <div style={{
                  marginTop: 24,
                  padding: "20px 24px",
                  background: "#0e1117",
                  border: "1px solid #2a2d3a",
                  borderRadius: 10,
                  display: "inline-block",
                }}>
                  <p style={{
                    fontSize: 15,
                    color: "#c8d0e8",          // ← bright readable white-blue
                    fontFamily: "monospace",
                    fontWeight: 600,
                    margin: "0 0 8px",
                    letterSpacing: "0.02em",
                  }}>
                    ◌ Not suitable for visualization
                  </p>
                  <p style={{
                    fontSize: 12,
                    color: "#8090b0",          // ← softer but still readable
                    fontFamily: "monospace",
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    All values are identical — no meaningful distribution to chart.
                  </p>
                </div>
                {/* ↑ TO HERE */}
          
              </div>
            );
          }
      
        const needsRotation = results.length > 6;
      
        return (
          <div style={{
            width: "100%", height: 340,
            background: "#080b12", border: "1px solid #1e2230",
            borderRadius: 12, padding: "16px 8px 8px 8px",
          }}>
            <p style={{
              margin: "0 0 12px 8px", fontSize: 11, color: "#4a5a7a",
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "monospace", fontWeight: 600,
            }}>
              Chart View
            </p>
      
            <ResponsiveContainer width="100%" height="90%">
              {type === "bar" ? (
                <BarChart
                  data={results}
                  margin={{ top: 4, right: 16, left: 0, bottom: needsRotation ? 48 : 8 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey={xKey}
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={renderLabel}
                    angle={needsRotation ? -35 : 0}
                    textAnchor={needsRotation ? "end" : "middle"}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "#1e2230" }}
                  />
                  <YAxis
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar
                    dataKey={yKey}
                    fill={CHART_COLORS.bar}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
      
              ) : type === "line" ? (
                <LineChart
                  data={results}
                  margin={{ top: 4, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey={xKey}
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={renderLabel}
                    tickLine={false}
                    axisLine={{ stroke: "#1e2230" }}
                  />
                  <YAxis
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey={yKey}
                    stroke={CHART_COLORS.line}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_COLORS.line, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: CHART_COLORS.line }}
                  />
                </LineChart>
      
              ) : (
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#8090b0", fontSize: 11, fontFamily: "monospace" }}>
                        {value}
                      </span>
                    )}
                  />
                  <Pie
                    data={results}
                    dataKey={yKey}
                    nameKey={xKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    paddingAngle={3}
                    label={({ name }) => renderLabel(name)}
                    labelLine={{ stroke: "#2a3040" }}
                  >
                    {results.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        );
      }