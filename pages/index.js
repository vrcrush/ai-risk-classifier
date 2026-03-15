import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import styles from "./index.module.css";

const RISK_CONFIG = {
  UNACCEPTABLE: {
    label: "Unacceptable Risk",
    short: "BANNED",
    color: "#E24B4A",
    bg: "#2a1010",
    border: "#5a1f1f",
    icon: "⊗",
    description: "Prohibited under EU AI Act",
  },
  HIGH: {
    label: "High Risk",
    short: "HIGH",
    color: "#D85A30",
    bg: "#251510",
    border: "#5a2e15",
    icon: "▲",
    description: "Requires conformity assessment",
  },
  LIMITED: {
    label: "Limited Risk",
    short: "LIMITED",
    color: "#BA7517",
    bg: "#1e1a0e",
    border: "#4a3a10",
    icon: "◆",
    description: "Transparency obligations apply",
  },
  MINIMAL: {
    label: "Minimal Risk",
    short: "MINIMAL",
    color: "#639922",
    bg: "#111a0a",
    border: "#2d4410",
    icon: "●",
    description: "No mandatory requirements",
  },
};

const EXAMPLES = [
  "A resume screening tool that ranks job applicants using ML to filter candidates before human review",
  "A customer service chatbot that answers FAQs and escalates to human agents",
  "A real-time emotion detection system deployed in retail stores to analyze shopper behavior",
  "A recommendation engine for a music streaming platform",
];

const SESSION_LIMIT = 5;
const DEBOUNCE_MS = 5000;
const MIN_CHARS = 25;
const MAX_CHARS = 2000;

function isGibberish(text) {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return true;
  if (!/\s/.test(trimmed) && trimmed.length > 20) return true;
  const chars = trimmed.toLowerCase().replace(/\s/g, "");
  if (chars.length > 8) {
    const unique = new Set(chars).size;
    if (unique / chars.length < 0.15) return true;
  }
  if (/(.)\1{6,}/.test(trimmed)) return true;
  return false;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

async function exportPDF(result, cfg, input) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  const tierRgb = hexToRgb(cfg.color);
  const darkBg = [18, 20, 24];
  const cardBg = [15, 16, 21];
  const textPrimary = [232, 230, 224];
  const textSecondary = [160, 168, 184];
  const textMuted = [139, 154, 176];
  const borderColor = [30, 33, 40];

  // Header bar
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, W, 297, "F");

  doc.setFillColor(...tierRgb);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AI RISK RADAR", margin, 16);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text("EU AI ACT RISK CLASSIFICATION REPORT", margin, 23);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, 29);
  doc.text("00ia.com", W - margin, 29, { align: "right" });

  y = 50;

  // Tier result card
  doc.setFillColor(...hexToRgb(cfg.bg.replace("#", "") ? cfg.bg : "#1a1a1a"));
  doc.setDrawColor(...tierRgb);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "FD");

  doc.setTextColor(...tierRgb);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(cfg.label.toUpperCase(), margin + 6, y + 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(cfg.description, margin + 6, y + 18);

  // Confidence
  doc.setTextColor(...textMuted);
  doc.setFontSize(7);
  doc.text("CONFIDENCE", W - margin - 6, y + 8, { align: "right" });
  doc.setTextColor(...tierRgb);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(result.confidence, W - margin - 6, y + 16, { align: "right" });

  y += 36;

  // Verdict
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
  doc.setTextColor(...textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("// VERDICT", margin + 4, y + 5);
  y += 12;

  doc.setTextColor(...textPrimary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  y = wrapText(doc, result.headline, margin, y, contentW, 6);
  y += 6;

  // System description
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
  doc.setTextColor(...textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("// SYSTEM DESCRIPTION", margin + 4, y + 5);
  y += 12;

  doc.setTextColor(...textSecondary);
  doc.setFontSize(8.5);
  y = wrapText(doc, input.trim(), margin, y, contentW, 5.5);
  y += 6;

  // Regulatory reasoning
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
  doc.setTextColor(...textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("// REGULATORY REASONING", margin + 4, y + 5);
  y += 12;

  doc.setTextColor(...textSecondary);
  doc.setFontSize(8.5);
  y = wrapText(doc, result.reasoning, margin, y, contentW, 5.5);
  y += 6;

  // Risk flags
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
  doc.setTextColor(...textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("// RISK FLAGS IDENTIFIED", margin + 4, y + 5);
  y += 12;

  result.flags?.forEach((flag) => {
    doc.setTextColor(...tierRgb);
    doc.setFontSize(8.5);
    doc.text("▸", margin, y);
    doc.setTextColor(...textSecondary);
    y = wrapText(doc, flag, margin + 5, y, contentW - 5, 5.5);
    y += 2;
  });
  y += 4;

  // Obligations
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
  doc.setTextColor(...textMuted);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("// REGULATORY OBLIGATIONS", margin + 4, y + 5);
  y += 12;

  result.obligations?.forEach((ob, i) => {
    doc.setTextColor(...textMuted);
    doc.setFontSize(8.5);
    doc.text(`${String(i + 1).padStart(2, "0")}.`, margin, y);
    doc.setTextColor(...textSecondary);
    y = wrapText(doc, ob, margin + 7, y, contentW - 7, 5.5);
    y += 2;
  });
  y += 4;

  // Similar systems
  if (result.similar_systems?.length) {
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, y, contentW, 8, 1, 1, "FD");
    doc.setTextColor(...textMuted);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("// SIMILAR SYSTEMS", margin + 4, y + 5);
    y += 12;

    doc.setTextColor(...textSecondary);
    doc.setFontSize(8.5);
    doc.text(result.similar_systems.join("  ·  "), margin, y);
    y += 10;
  }

  // Footer
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, 282, W - margin, 282);
  doc.setTextColor(...textMuted);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Built by 00IA  ·  Based on EU AI Act (Regulation 2024/1689)  ·  For informational purposes only  ·  Not legal advice", W / 2, 287, { align: "center" });
  doc.text("00ia.com", W / 2, 292, { align: "center" });

  doc.save(`ai-risk-radar-${result.tier.toLowerCase()}-${Date.now()}.pdf`);
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const cooldownTimer = useRef(null);

  const isValid = input.trim().length >= MIN_CHARS && input.trim().length <= MAX_CHARS;
  const isDisabled = loading || cooldown || limitReached || !isValid;

  const classify = useCallback(async () => {
    if (isDisabled) return;

    if (isGibberish(input)) {
      setError("Input does not look like a valid AI system description. Please be more descriptive.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCooldown(true);

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError("Too many requests. Please wait 5 minutes and try again.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Classification failed.");
        return;
      }

      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (newCount >= SESSION_LIMIT) setLimitReached(true);

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      cooldownTimer.current = setTimeout(() => setCooldown(false), DEBOUNCE_MS);
    }
  }, [input, isDisabled, sessionCount]);

  const cfg = result ? RISK_CONFIG[result.tier] : null;

  const charColor =
    input.length > MAX_CHARS ? "#E24B4A" :
    input.length > MAX_CHARS * 0.85 ? "#BA7517" : "#2d3240";

  return (
    <>
      <Head>
        <title>AI Risk Radar — 00IA</title>
      </Head>

      <div className={styles.scanline} />

      <header className={styles.header}>
        <a href="https://00ia.com" target="_blank" rel="noopener noreferrer" className={styles.logo}>
          AI RISK <span className={styles.logoAccent}>RADAR</span>
        </a>
        <a
          href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.badge}
        >
          EU AI Act · 2024/1689
        </a>
      </header>

      <main className={styles.main}>
        <div className={styles.sectionLabel}>// AI GOVERNANCE TOOL</div>
        <h1 className={styles.title}>
          AI RISK<br />
          <span className={styles.titleAccent}>RADAR</span>
        </h1>
        <p className={styles.subtitle}>
          Describe your AI system. Get an instant risk tier classification based on the EU AI Act framework — with obligations, red flags, and regulatory context.
        </p>

        <div className={styles.tierGrid}>
          {Object.entries(RISK_CONFIG).map(([key, c]) => (
            <div className={styles.tierCard} key={key}>
              <div className={styles.tierCardIcon} style={{ color: c.color }}>{c.icon}</div>
              <div className={styles.tierCardLabel} style={{ color: c.color }}>{c.short}</div>
              <div className={styles.tierCardDesc}>{c.description}</div>
            </div>
          ))}
        </div>

        <div className={styles.inputWrapper}>
          <div className={styles.inputLabel}>// DESCRIBE YOUR AI SYSTEM</div>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS + 50) setInput(e.target.value);
            }}
            placeholder="e.g. A tool that uses computer vision to assess creditworthiness from facial features for loan applications..."
            rows={5}
          />
          <div className={styles.charCount} style={{ color: charColor }}>
            {input.length}/{MAX_CHARS}
          </div>
        </div>

        {input.length > 0 && input.length < MIN_CHARS && (
          <div className={styles.hintBox}>
            Minimum {MIN_CHARS} characters — {MIN_CHARS - input.length} more to go.
          </div>
        )}

        <div className={styles.examples}>
          <div className={styles.sectionLabel}>// QUICK EXAMPLES</div>
          <div className={styles.examplesList}>
            {EXAMPLES.map((p, i) => (
              <button key={i} className={styles.exampleChip} onClick={() => setInput(p)} title={p}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {limitReached ? (
          <div className={styles.limitBox}>
            You have reached the session limit of {SESSION_LIMIT} classifications. Refresh the page to continue.
          </div>
        ) : (
          <button
            className={styles.classifyBtn}
            onClick={classify}
            disabled={isDisabled}
          >
            {loading ? (
              <span className={styles.btnInner}>
                ANALYZING SYSTEM
                <span className={styles.loader}>
                  <span /><span /><span />
                </span>
              </span>
            ) : cooldown ? "COOLING DOWN..." : `CLASSIFY RISK TIER → (${SESSION_LIMIT - sessionCount} left)`}
          </button>
        )}

        {error && <div className={styles.errorBox}>ERROR: {error}</div>}

        {result && cfg && (
          <div className={styles.result}>
            <div
              className={styles.resultHeader}
              style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
            >
              <div>
                <div className={styles.resultHeaderLabel}>RISK CLASSIFICATION</div>
                <div className={styles.tierBadge}>{cfg.label}</div>
                <div className={styles.tierDesc}>{cfg.description}</div>
              </div>
              <div className={styles.tierMeta}>
                <div className={styles.tierMetaLabel}>CONFIDENCE</div>
                <div className={styles.confBar}>
                  {[3, 2, 1].map((threshold, i) => {
                    const filled = result.confidence === "HIGH" ? 3 : result.confidence === "MEDIUM" ? 2 : 1;
                    return (
                      <div
                        key={i}
                        className={styles.confDot}
                        style={{ background: (3 - i) <= filled ? cfg.color : "#1e2128" }}
                      />
                    );
                  })}
                </div>
                <div className={styles.tierMetaVal}>{result.confidence}</div>
              </div>
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultSection}>
                <div className={styles.resultSectionLabel}>// VERDICT</div>
                <div className={styles.headline}>{result.headline}</div>
              </div>
              <div className={styles.resultSection}>
                <div className={styles.resultSectionLabel}>// REGULATORY REASONING</div>
                <div className={styles.reasoning}>{result.reasoning}</div>
              </div>
              <div className={styles.resultSection}>
                <div className={styles.resultSectionLabel}>// RISK FLAGS IDENTIFIED</div>
                <div className={styles.flagsList}>
                  {result.flags?.map((f, i) => (
                    <div className={styles.flagItem} key={i}>
                      <span className={styles.flagDot}>▸</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.resultSection}>
                <div className={styles.resultSectionLabel}>// REGULATORY OBLIGATIONS</div>
                <div className={styles.obligationsList}>
                  {result.obligations?.map((ob, i) => (
                    <div className={styles.obligationItem} key={i}>
                      <span className={styles.obNum}>{String(i + 1).padStart(2, "0")}.</span>
                      <span>{ob}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.resultSection}>
                <div className={styles.resultSectionLabel}>// SIMILAR SYSTEMS</div>
                <div className={styles.similarTags}>
                  {result.similar_systems?.map((s, i) => (
                    <span className={styles.similarTag} key={i}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <button
              className={styles.exportBtn}
              onClick={async () => {
                setPdfLoading(true);
                await exportPDF(result, cfg, input);
                setPdfLoading(false);
              }}
              disabled={pdfLoading}
            >
              {pdfLoading ? "GENERATING PDF..." : "EXPORT REPORT AS PDF ↓"}
            </button>
          </div>
        )}

        <hr className={styles.divider} />
        <div className={styles.footer}>
          BUILT BY 00IA · BASED ON EU AI ACT (REGULATION 2024/1689) · FOR INFORMATIONAL PURPOSES ONLY · NOT LEGAL ADVICE
        </div>
      </main>
    </>
  );
}
