# AI Risk Classifier

Classify AI systems by EU AI Act risk tier — powered by Claude.

Built for [00IA](https://00ia.com) by Pablo Bolzon.

---

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-risk-classifier.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

### 3. Add the API key

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

Then go to **Deployments → Redeploy** (so the env var takes effect).

---

## Local development

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it works

- **Frontend**: `/pages/index.js` — collects system description, calls API route
- **API route**: `/pages/api/classify.js` — server-side call to Anthropic, key never exposed to browser
- **Framework**: EU AI Act (Regulation 2024/1689), four risk tiers

---

*For informational purposes only. Not legal advice.*
