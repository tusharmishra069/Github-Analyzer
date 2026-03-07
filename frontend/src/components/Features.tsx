"use client";
import { motion } from "framer-motion";
import { GitBranch, User, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";

// ── macOS traffic-light dots (colours only here, nowhere else) ──────────────
function ChromeDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
      <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
      <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
    </div>
  );
}

// ── Mini browser chrome wrapper ──────────────────────────────────────────────
function BrowserFrame({
  url,
  children,
  dark = false,
}: {
  url: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        dark ? "border-slate-700" : "border-slate-200"
      } shadow-sm`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          dark ? "bg-slate-800" : "bg-slate-100"
        }`}
      >
        <ChromeDots />
        <span
          className={`text-[10px] ml-2 font-mono truncate ${
            dark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {url}
        </span>
      </div>
      <div className={dark ? "bg-slate-900" : "bg-white"}>{children}</div>
    </div>
  );
}

// ── Card 1 preview: Repo Analysis — mirrors the real report UI ──────────────
function RepoPreview() {
  const bugs = ["Missing input validation on /api/analyze", "CORS wildcard exposes all origins"];
  const improvements = ["Add rate limiting per IP", "Swap to async SQLAlchemy"];
  const r = 28, cx = 36, cy = 36, circum = 2 * Math.PI * r;
  const fill = (92 / 100) * circum; // "A" grade

  return (
    <BrowserFrame url="codebase-analyzer.vercel.app/repo-analysis">
      {/* inner bento grid — 3 mini cards matching the real report */}
      <div className="p-3 bg-slate-50/60 space-y-2">

        {/* Row 1: Health + Architecture side by side */}
        <div className="grid grid-cols-5 gap-2">
          {/* Health ring card */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest self-start">Health</span>
            <div className="relative flex items-center justify-center">
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
                <motion.circle
                  cx={cx} cy={cy} r={r}
                  fill="none" stroke="#10b981" strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={`${circum}`}
                  strokeDashoffset={circum}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "36px 36px" }}
                  whileInView={{ strokeDashoffset: circum - fill }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  viewport={{ once: true }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-black text-emerald-600 leading-none">A</span>
                <span className="text-[7px] text-slate-400 uppercase tracking-wide">Score</span>
              </div>
            </div>
          </div>

          {/* Architecture card */}
          <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-indigo-500/20 blur-xl rounded-full pointer-events-none" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest relative z-10">Architecture</span>
            <p className="text-[9px] text-slate-400 leading-relaxed relative z-10 line-clamp-3">
              FastAPI backend with FAISS vector store, Groq LLM, and Neon Postgres. Clean separation of concerns across worker, parser, and AI engine layers.
            </p>
            <div className="flex gap-1 flex-wrap relative z-10 mt-0.5">
              {["FastAPI", "FAISS", "Groq"].map((t) => (
                <span key={t} className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Bugs + Improvements side by side */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bugs */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-4 h-4 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center">
                <span className="text-[8px] text-rose-500">⚠</span>
              </div>
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Bugs</span>
            </div>
            <div className="space-y-1">
              {bugs.map((b, i) => (
                <div key={i} className="flex items-start gap-1 p-1.5 rounded-lg bg-rose-50/60 border border-rose-100">
                  <span className="mt-1 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-[8px] text-rose-800 leading-tight">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-4 h-4 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <span className="text-[8px] text-indigo-500">↑</span>
              </div>
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Fixes</span>
            </div>
            <div className="space-y-1">
              {improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-1 p-1.5 rounded-lg bg-indigo-50/40 border border-indigo-50">
                  <span className="mt-1 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-[8px] text-indigo-900/80 leading-tight">{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </BrowserFrame>
  );
}

// ── Card 2 preview: Profile Review ──────────────────────────────────────────
function ProfileReviewPreview() {
  const langs = [
    { name: "TypeScript", pct: 68 },
    { name: "Python", pct: 22 },
    { name: "CSS", pct: 10 },
  ];
  return (
    <BrowserFrame url="codebase-analyzer.vercel.app/profile-review">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
            TM
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">
              tusharmishra069
            </div>
            <div className="text-[10px] text-slate-400">42 repos · 1.2k stars</div>
          </div>
        </div>
        <div className="space-y-2">
          {langs.map((l) => (
            <div key={l.name} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-20 shrink-0">
                {l.name}
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                <motion.div
                  className="h-1.5 bg-slate-700 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${l.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{l.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Card 3 preview: Profile Roast ───────────────────────────────────────────
function ProfileRoastPreview() {
  const lines = [
    { emoji: "💀", text: "15 repos with zero README files." },
    { emoji: "🕸️", text: "Last commit: 3 months ago. Touch grass." },
    { emoji: "🍝", text: "main.js is 800 lines of spaghetti." },
    { emoji: "😬", text: "Forked repos outnumber originals 3:1." },
  ];
  return (
    <BrowserFrame url="codebase-analyzer.vercel.app/profile-roast" dark>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🔥</span>
          <span className="text-[10px] text-slate-400 font-mono">// roast.output — tusharmishra069</span>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
            <span className="text-sm shrink-0 leading-none mt-0.5">{line.emoji}</span>
            <span className="text-[10px] text-slate-300 leading-relaxed">{line.text}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className="text-[10px] text-slate-500">
            🧾 Verdict:{" "}
            <span className="text-slate-300 font-medium">
              "A graveyard of half-finished ideas. 💔"
            </span>
          </span>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ── Main Features section ────────────────────────────────────────────────────
export function Features() {
  const cards = [
    {
      module: "Module 01",
      icon: <GitBranch className="w-4 h-4 text-slate-600" />,
      title: "Repo Analysis",
      description:
        "Paste a GitHub URL. Get a Staff Engineer-grade review: health score, architecture map, security bugs with severity levels, and prioritised improvements.",
      tags: ["RAG", "FAISS", "Groq LLM"],
      href: "/repo-analysis",
      preview: <RepoPreview />,
      col: "md:col-span-7",
      bg: "bg-slate-50",
      border: "border-slate-200",
      textPrimary: "text-slate-900",
      textSecondary: "text-slate-500",
      tagBg: "bg-white border border-slate-200 text-slate-600",
      dark: false,
    },
    {
      module: "Module 02",
      icon: <User className="w-4 h-4 text-slate-500" />,
      title: "Profile Review",
      description:
        "Analyse a GitHub profile — language breakdown, activity patterns, repo quality scores, and personalised growth recommendations.",
      tags: ["GitHub API", "NLP"],
      href: "/profile-review",
      preview: <ProfileReviewPreview />,
      col: "md:col-span-5",
      bg: "bg-white",
      border: "border-slate-200",
      textPrimary: "text-slate-900",
      textSecondary: "text-slate-500",
      tagBg: "bg-slate-50 border border-slate-200 text-slate-600",
      dark: false,
    },
  ];

  return (
    <section id="features" className="py-32 bg-white relative z-10 w-full">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-6xl font-bold tracking-tight text-slate-900 mb-4">
            Three Tools One <span className="text-blue-600 ">Codebase</span>
            </h2>
          <p className="text-lg text-slate-500">
            From deep architecture reviews to public profile roasts every angle
            of your GitHub presence, analysed.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full auto-rows-[minmax(200px,auto)]">
          {cards.map((card, i) => (
            <motion.div
              key={card.module}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`col-span-1 ${card.col} ${card.bg} rounded-3xl border ${card.border} p-8 flex flex-col justify-between gap-6 overflow-hidden`}
            >
              {/* Top row: meta + CTA */}
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        card.dark ? "bg-slate-800" : "bg-white border border-slate-200"
                      }`}
                    >
                      {card.icon}
                    </div>
                    <span
                      className={`text-[11px] font-mono font-medium tracking-widest uppercase ${
                        card.dark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {card.module}
                    </span>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${card.textPrimary}`}>
                      {card.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed ${card.textSecondary} max-w-sm`}>
                      {card.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full ${card.tagBg}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={card.href}
                  className={`shrink-0 ml-4 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    card.dark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Try it <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Browser preview */}
              <div className="w-full">{card.preview}</div>
            </motion.div>
          ))}

          {/* ── Module 03: Profile Roast — full-width horizontal card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="col-span-1 md:col-span-12 bg-slate-900 rounded-3xl border border-slate-800 p-8 flex flex-col md:flex-row items-center gap-10 overflow-hidden"
          >
            {/* LEFT — text content */}
            <div className="flex-1 space-y-5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-[11px] font-mono font-medium tracking-widest uppercase text-slate-500">
                  Module 03
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Profile Roast</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400 max-w-md">
                  Submit to the roast. An uncensored AI comedian tears through your commit history,
                  naming conventions, and long-dead projects.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Comedy Mode", "No mercy"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/profile-roast"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Try it <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* RIGHT — browser chrome preview */}
            <div className="w-full md:w-[48%] shrink-0">
              <ProfileRoastPreview />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
