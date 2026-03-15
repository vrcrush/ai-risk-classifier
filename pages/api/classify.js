const SYSTEM_PROMPT = `You are an expert on the EU AI Act and AI risk classification. Classify AI systems into one of four risk tiers based on their description.

TIERS:
- UNACCEPTABLE: AI systems that pose unacceptable risk and are prohibited (e.g., social scoring by governments, real-time remote biometric identification in public spaces, subliminal manipulation, exploitation of vulnerabilities)
- HIGH: AI systems in high-risk domains requiring conformity assessment (e.g., CV/recruitment screening, credit scoring, medical diagnosis, critical infrastructure, law enforcement, migration/asylum decisions, education assessment, safety components of products)
- LIMITED: AI systems with specific transparency obligations (e.g., chatbots, deepfake generators, emotion recognition systems with disclosure requirements)
- MINIMAL: All other AI systems with no mandatory requirements under the EU AI Act (e.g., spam filters, AI in video games, recommendation systems without safety implications)

Respond ONLY with a valid JSON object — no markdown, no preamble, no explanation outside the JSON. Use this exact structure:
{
  "tier": "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "headline": "One-sentence verdict (max 15 words)",
  "reasoning": "2-3 sentence explanation of why this tier applies",
  "flags": ["flag 1", "flag 2", "flag 3"],
  "obligations": ["obligation 1", "obligation 2", "obligation 3"],
  "similar_systems": ["example 1", "example 2"]
}

flags = specific risk factors identified in the description
obligations = what the operator must do under EU AI Act (or why it is prohibited/unrestricted)
similar_systems = real-world analogues to this type of system`;

// In-memory rate limit store: { ip: { count, resetAt } }
const rateLimitStore = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 5 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count += 1;
  return true;
}

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function sanitize(text) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[<>'"`;]/g, "")
    .trim();
}

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait 5 minutes and try again." });
  }

  const { description } = req.body;

  if (!description || typeof description !== "string") {
    return res.status(400).json({ error: "Invalid input." });
  }

  const clean = sanitize(description);

  if (clean.length < 10) {
    return res.status(400).json({ error: "Description too short. Please provide at least 10 characters." });
  }

  if (clean.length > 2000) {
    return res.status(400).json({ error: "Description too long. Please keep it under 2000 characters." });
  }

  if (isGibberish(clean)) {
    return res.status(400).json({ error: "Input does not look like a valid AI system description." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Classify this AI system: ${clean}` },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Anthropic API error:", errData);
      return res.status(502).json({ error: "Classification service unavailable." });
    }

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Failed to parse classification result." });
  }
}
