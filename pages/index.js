import Head from "next/head";
import { useState } from "react";
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

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const classify = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Classification failed.");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? RISK_CONFIG[result.tier] : null;

  return (
    <>
      <Head>
        <title>AI Risk Classifier — 00IA</title>
      </Head>

      <div className={styles.scanline} />

      <header className={styles.header}>
        <div className={styles.logo}>
          00<span className={styles.logoAccent}>I</span>A — RISK<span className={styles.logoAccent}>.</span>AI
        </div>
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
          AI SYSTEM<br />
          <span className={styles.titleAccent}>RISK</span> CLASSIFIER
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
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. A tool that uses computer vision to assess creditworthiness from facial features for loan applications..."
            rows={5}
          />
          <div className={styles.charCount}>{input.length}</div>
        </div>

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

        <button
          className={styles.classifyBtn}
          onClick={classify}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <span className={styles.btnInner}>
              ANALYZING SYSTEM
              <span className={styles.loader}>
                <span /><span /><span />
              </span>
            </span>
          ) : "CLASSIFY RISK TIER →"}
        </button>

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
          </div>
        )}

        <hr className={styles.divider} />
        <div className={styles.footer}>
          POWERED BY CLAUDE · BASED ON EU AI ACT (REGULATION 2024/1689) · FOR INFORMATIONAL PURPOSES ONLY · NOT LEGAL ADVICE
        </div>
      </main>
    </>
  );
}
