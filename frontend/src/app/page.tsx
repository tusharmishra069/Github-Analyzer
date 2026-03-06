"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, CheckCircle2, FileCode2, FlaskConical, LayoutTemplate, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Navbar } from "@/components/Navbar";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { ThreeDScene } from "@/components/ThreeDScene";

type JobState = "idle" | "processing" | "complete" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [jobState, setJobState] = useState<JobState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const API_BASE = "http://localhost:8000/api";

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setError("");
    setJobState("processing");
    setProgress(5);
    setStatusMessage("Submitting to AI Analyzer...");

    // Smooth scroll to top when starting
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!res.ok) throw new Error("Failed to start analysis");

      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
      setError("Backend connection failed. Is the Python API running?");
      setJobState("error");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!jobId) return;
      try {
        const res = await fetch(`${API_BASE}/jobs/${jobId}/status`);
        const data = await res.json();

        setProgress(data.progress);
        setStatusMessage(data.message);

        if (data.status === "COMPLETED") {
          setResult(data.result);
          setJobState("complete");
          clearInterval(interval);
        } else if (data.status === "FAILED") {
          setError(data.message);
          setJobState("error");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    if (jobState === "processing" && jobId) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(interval);
  }, [jobId, jobState]);

  return (
    <div className="min-h-screen bg-grid-white relative">
      <Navbar />

      <main className="flex flex-col items-center pt-32 pb-20 w-full relative z-10">

        {/* Dynamic Floating 3D Background */}
        <ThreeDScene />

        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-0" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-slate-50 blur-3xl opacity-50 pointer-events-none z-0" />

        <div className="max-w-6xl w-full px-6 relative z-10 flex flex-col items-center">

          {/* Landing Hero Area */}
          <AnimatePresence mode="wait">
            {(jobState === "idle" || jobState === "error") && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full flex flex-col items-center text-center space-y-6 pt-10"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 mb-4 backdrop-blur-md">
                  <FlaskConical className="w-4 h-4 text-indigo-500" />
                  <span>Powered by Groq & FAISS</span>
                </div>

                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 max-w-5xl leading-[1.1]">
                  Review any codebase <br className="hidden md:block" /> in seconds, not hours.
                </h1>

                <p className="text-lg md:text-xl text-slate-500 max-w-2xl font-normal leading-relaxed mt-4">
                  With our state of the art, cutting edge AI model, we scan your GitHub layers to unearth bugs, architecture smells, and security risks instantly.
                </p>

                {/* Input Form matching the sleek aesthetic */}
                <form onSubmit={handleAnalyze} className="w-full max-w-xl mt-12 relative group">
                  <div className="relative flex items-center shadow-2xl shadow-indigo-900/5 rounded-2xl bg-white p-2 border border-slate-200 ring-4 ring-white/50 transition-all hover:ring-slate-100 backdrop-blur-xl">
                    <div className="pl-4 pr-2 text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="flex-1 border-0 shadow-none focus-visible:ring-0 text-lg h-14 px-2 bg-transparent text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                    <Button
                      type="submit"
                      className="h-14 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-base font-semibold flex items-center gap-2 transition-all active:scale-95"
                    >
                      Analyze <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm font-medium mt-4 absolute w-full text-center">
                      {error}
                    </motion.p>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing State */}
          <AnimatePresence>
            {jobState === "processing" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-3xl mt-20"
              >
                <div className="bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 rounded-3xl p-12 flex flex-col items-center justify-center space-y-8 relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white/10" />
                  <div className="absolute top-0 left-0 h-1.5 bg-slate-900 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="p-5 bg-white shadow-sm border border-slate-100 rounded-2xl mb-6">
                      <Loader2 className="w-12 h-12 animate-spin text-slate-900" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Extracting Insights</h3>
                    <p className="text-slate-500 font-medium mt-3 text-lg">{statusMessage}</p>
                  </div>

                  <div className="w-full max-w-md bg-slate-100 rounded-full h-3 relative z-10 overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full bg-slate-900 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Dashboard (Bento Grid Style) */}
          {jobState === "complete" && result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-6xl mt-12 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50"
            >
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
                <div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900">Analysis Report</h2>
                  <div className="flex items-center gap-2 mt-3 text-slate-500">
                    <FileCode2 className="w-5 h-5 text-indigo-500" />
                    <span className="text-base font-medium">{url.replace("https://github.com/", "")}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full px-6 h-12 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => {
                    setJobState("idle");
                    setUrl("");
                    setResult(null);
                  }}
                >
                  Scan another repository
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">

                {/* Score Bento Card (Small) */}
                <div className="col-span-1 md:col-span-4 bg-slate-50 bg-grid-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 mb-4 tracking-wide uppercase">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Overall Health
                    </div>
                    <div className="text-8xl font-black text-slate-900 tracking-tighter">
                      {result.health_score || "B+"}
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-200/60 relative z-10">
                    <p className="text-sm font-medium text-slate-500">Based on architectural solidity, bug severity, and best-practice adherence.</p>
                  </div>
                </div>

                {/* Architecture Bento Card (Large) */}
                <div className="col-span-1 md:col-span-8 bg-slate-900 text-white border border-slate-800 rounded-3xl shadow-xl shadow-slate-900/10 p-8 flex flex-col relative overflow-hidden">
                  <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 mb-6 tracking-wide uppercase">
                      <LayoutTemplate className="w-4 h-4" />
                      System Architecture
                    </div>
                    <p className="text-xl text-slate-300 leading-relaxed font-light flex-1">
                      {result.architecture_summary || "Our AI could not extract a unified architecture map for this repository."}
                    </p>
                  </div>
                </div>

                {/* Bugs List */}
                <div className="col-span-1 md:col-span-6 bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-rose-500 mb-6 tracking-wide uppercase">
                    <ShieldAlert className="w-4 h-4" />
                    Vulnerabilities & Bugs ({result.bugs?.length || 0})
                  </div>

                  {result.bugs && result.bugs.length > 0 ? (
                    <div className="space-y-4">
                      {result.bugs.map((bug: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 group">
                          <h4 className="font-bold text-rose-900 text-lg">{bug.title}</h4>
                          <p className="text-rose-700/80 mt-2 text-sm font-medium leading-relaxed">{bug.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      No high-severity bugs discovered.
                    </div>
                  )}
                </div>

                {/* Improvements List */}
                <div className="col-span-1 md:col-span-6 bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-indigo-500 mb-6 tracking-wide uppercase">
                    <FlaskConical className="w-4 h-4" />
                    Refactoring Opportunities ({result.improvements?.length || 0})
                  </div>

                  {result.improvements && result.improvements.length > 0 ? (
                    <div className="space-y-4">
                      {result.improvements.map((imp: any, idx: number) => (
                        <div key={idx} className="flex gap-5 p-5 rounded-2xl bg-indigo-50/30 border border-indigo-50 group">
                          <div className="shrink-0 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-100" />
                          </div>
                          <div>
                            <h4 className="font-bold text-indigo-950 text-base">{imp.title}</h4>
                            <p className="text-indigo-900/70 mt-2 text-sm font-medium leading-relaxed">{imp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      Codebase is highly optimized.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Conditionally reveal landing page marketing sections if idle */}
      {jobState === "idle" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* <Features /> */}
          {/* <Pricing /> */}
        </motion.div>
      )}

      <Footer />
    </div>
  );
}
