import { useState } from "react";

const checks = [
  {
    section: "CONTEXTO 4H",
    color: "#00d4ff",
    items: [
      { id: "sr", label: "Precio en zona S/R relevante en 4H" },
      { id: "estructura", label: "Estructura válida: máximos/mínimos en la dirección del trade" },
    ]
  },
  {
    section: "ENTRADA 15MIN",
    color: "#00ffaa",
    items: [
      { id: "patron", label: "Patrón de continuación visible (cuña / bandera / canal)" },
      { id: "fib", label: "Retroceso al 0.5–0.75 de Fibonacci" },
      { id: "ema", label: "Rotura de EMA 50 en 15min confirmada" },
    ]
  },
  {
    section: "GESTIÓN",
    color: "#ffaa00",
    items: [
      { id: "sl", label: "Stop Loss definido ANTES de entrar" },
      { id: "tp", label: "Take Profit en máximo/mínimo anterior (R/R ≥ 1.5)" },
      { id: "riesgo", label: "Riesgo calculado (1–3% según confluencias)" },
      { id: "aislado", label: "Margen aislado activado en Bitget" },
    ]
  },
  {
    section: "CONFLUENCIAS EXTRA",
    color: "#cc88ff",
    items: [
      { id: "cipher", label: "Señal Cipher B (punto verde/dorado) alineada" },
      { id: "tendencia", label: "Tendencia diaria a favor (opcional pero suma)" },
    ]
  }
];

function ChecklistTab({ checked, setChecked }) {
  const total = checks.flatMap(s => s.items).length;
  const done = Object.values(checked).filter(Boolean).length;
  const allDone = done === total;

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const reset = () => setChecked({});

  const confluences = (checked.cipher ? 1 : 0) + (checked.tendencia ? 1 : 0);
  const baseChecks = ["sr","estructura","patron","fib","ema","sl","tp","riesgo","aislado"];
  const baseDone = baseChecks.filter(id => checked[id]).length;
  let riesgoRec = baseDone >= 9 && confluences === 2 ? "3%" : baseDone >= 9 && confluences === 1 ? "2%" : baseDone >= 9 ? "1%" : "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Progreso</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: allDone ? "#00ffaa" : "#fff", fontFamily: "'Space Mono', monospace" }}>
            {done}<span style={{ color: "#444", fontSize: 20 }}>/{total}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Riesgo recomendado</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: riesgoRec === "3%" ? "#ffaa00" : riesgoRec === "2%" ? "#00d4ff" : riesgoRec === "1%" ? "#00ffaa" : "#444", fontFamily: "'Space Mono', monospace" }}>
            {riesgoRec}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, marginBottom: 32, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(done/total)*100}%`, background: allDone ? "#00ffaa" : "#00d4ff", borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>

      {checks.map(section => (
        <div key={section.section} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: section.color, marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
            ▸ {section.section}
          </div>
          {section.items.map(item => (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                marginBottom: 6, borderRadius: 8, cursor: "pointer",
                background: checked[item.id] ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${checked[item.id] ? section.color + "44" : "#1f1f2e"}`,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked[item.id] ? section.color : "#333"}`,
                background: checked[item.id] ? section.color : "transparent", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease"
              }}>
                {checked[item.id] && <span style={{ color: "#000", fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: checked[item.id] ? "#ddd" : "#777", transition: "color 0.2s ease" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ))}

      {allDone && (
        <div style={{ padding: 16, borderRadius: 10, background: "rgba(0,255,170,0.08)", border: "1px solid #00ffaa44", textAlign: "center", marginTop: 8 }}>
          <div style={{ color: "#00ffaa", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>✓ Setup validado</div>
          <div style={{ color: "#888", fontSize: 13 }}>Riesgo recomendado: <strong style={{ color: "#00ffaa" }}>{riesgoRec}</strong></div>
        </div>
      )}

      <button onClick={reset} style={{
        marginTop: 20, width: "100%", padding: "10px", background: "transparent",
        border: "1px solid #222", borderRadius: 8, color: "#444", fontSize: 12,
        letterSpacing: 2, cursor: "pointer", textTransform: "uppercase", fontFamily: "'Space Mono', monospace"
      }}>
        Reiniciar checklist
      </button>
    </div>
  );
}

function CalcTab() {
  const [capital, setCapital] = useState("");
  const [riskPct, setRiskPct] = useState(1);
  const [slPct, setSlPct] = useState("");

  const cap = parseFloat(capital) || 0;
  const sl = parseFloat(slPct) || 0;
  const riskEur = cap * (riskPct / 100);
  const posicion = sl > 0 ? riskEur / (sl / 100) : 0;

  const leverageOptions = sl > 0 && cap > 0 ? [
    { lev: 2, margin: posicion / 2 },
    { lev: 3, margin: posicion / 3 },
    { lev: 5, margin: posicion / 5 },
    { lev: 10, margin: posicion / 10 },
  ] : [];

  const getLevColor = (lev) => lev <= 3 ? "#00ffaa" : lev <= 5 ? "#00d4ff" : "#ffaa00";
  const getLevLabel = (lev) => lev <= 3 ? "Conservador" : lev <= 5 ? "Moderado" : "Agresivo";

  const InputField = ({ label, value, onChange, placeholder, suffix }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "12px 40px 12px 16px", background: "#0d0d1a",
            border: "1px solid #1f1f2e", borderRadius: 8, color: "#fff", fontSize: 16,
            fontFamily: "'Space Mono', monospace", outline: "none", boxSizing: "border-box"
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#444", fontSize: 14 }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <InputField label="Capital total" value={capital} onChange={setCapital} placeholder="1000" suffix="€" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>Riesgo por trade</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map(r => (
            <button key={r} onClick={() => setRiskPct(r)} style={{
              flex: 1, padding: "12px 0", borderRadius: 8, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: 14, transition: "all 0.2s ease",
              background: riskPct === r ? (r === 1 ? "#00ffaa" : r === 2 ? "#00d4ff" : "#ffaa00") : "transparent",
              border: `1px solid ${riskPct === r ? "transparent" : "#1f1f2e"}`,
              color: riskPct === r ? "#000" : "#555"
            }}>{r}%</button>
          ))}
        </div>
      </div>

      <InputField label="Stop Loss (distancia desde entrada)" value={slPct} onChange={setSlPct} placeholder="2" suffix="%" />

      {cap > 0 && (
        <div style={{ padding: 20, background: "rgba(0,212,255,0.04)", border: "1px solid #00d4ff22", borderRadius: 10, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>RIESGO €</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#00ffaa", fontFamily: "'Space Mono', monospace" }}>{riskEur.toFixed(2)}€</div>
            </div>
            {posicion > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>POSICIÓN</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#00d4ff", fontFamily: "'Space Mono', monospace" }}>{posicion.toFixed(2)}€</div>
              </div>
            )}
          </div>
        </div>
      )}

      {leverageOptions.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>OPCIONES DE APALANCAMIENTO</div>
          {leverageOptions.map(({ lev, margin }) => (
            <div key={lev} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", marginBottom: 8, borderRadius: 8,
              border: `1px solid ${getLevColor(lev)}33`,
              background: `${getLevColor(lev)}08`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: getLevColor(lev), fontFamily: "'Space Mono', monospace", minWidth: 40 }}>{lev}x</div>
                <div style={{ fontSize: 12, color: getLevColor(lev), opacity: 0.7 }}>{getLevLabel(lev)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ccc", fontFamily: "'Space Mono', monospace" }}>{margin.toFixed(2)}€</div>
                <div style={{ fontSize: 11, color: "#555" }}>margen</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: "rgba(255,170,0,0.05)", borderRadius: 8, border: "1px solid #ffaa0022" }}>
            <div style={{ fontSize: 12, color: "#888" }}>
              ⚠ En todos los casos la pérdida máxima es <strong style={{ color: "#ffaa00" }}>{riskEur.toFixed(2)}€</strong>. El apalancamiento solo cambia cuánto margen dejas en el exchange.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TradingTool() {
  const [tab, setTab] = useState("checklist");
  const [checked, setChecked] = useState({});

  return (
    <div style={{
      minHeight: "100vh", background: "#080812", color: "#fff",
      fontFamily: "'Inter', sans-serif", padding: "0 0 40px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "32px 24px 0", borderBottom: "1px solid #0f0f1e", marginBottom: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#333", fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>BITGET · SWING TRADING</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 24 }}>
          Trade <span style={{ color: "#00d4ff" }}>Validator</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {[["checklist", "Checklist"], ["calc", "Calculadora"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "12px 0", background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === id ? "#00d4ff" : "transparent"}`,
              color: tab === id ? "#00d4ff" : "#444", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s ease", letterSpacing: 0.5
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 24px 0" }}>
        {tab === "checklist" ? (
          <ChecklistTab checked={checked} setChecked={setChecked} />
        ) : (
          <CalcTab />
        )}
      </div>
    </div>
  );
}