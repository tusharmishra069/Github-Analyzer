"use client";
import { motion } from "framer-motion";
import { Github, Zap, Shield, SearchCode, Database, Gauge } from "lucide-react";

export function Features() {
    return (
        <section id="features" className="py-32 bg-white relative z-10 w-full">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Deep code logic, uncovered</h2>
                    <p className="text-lg text-slate-500">Scan any GitHub repo. Get architecture diagrams, security insights, and refactoring maps in seconds.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full auto-rows-[minmax(200px,auto)]">
                    {/* Bento Item 1 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="col-span-1 md:col-span-7 bg-slate-50 rounded-3xl border border-slate-200 p-8 flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <Github className="w-6 h-6 text-slate-900" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Seamless GitHub integration</h3>
                            <p className="mt-2 text-slate-500">No complex onboarding. Just paste your repository URL, and our engine instantly clones, parses, and begins analyzing your codebase layers.</p>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
                                <SearchCode className="w-6 h-6 text-slate-600" />
                            </div>
                            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
                                <Github className="w-6 h-6 text-slate-900" />
                            </div>
                            <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center">
                                <Shield className="w-6 h-6 text-rose-500" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Bento Item 2 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="col-span-1 md:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-8 text-white flex flex-col justify-between relative overflow-hidden"
                    >
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />
                        <div className="relative z-10 w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center mb-6">
                            <Gauge className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold">Architectural mapping</h3>
                            <p className="mt-2 text-slate-400">Our LLM doesn't just read code; it understands patterns. It extracts the high-level architecture map directly from your raw source.</p>
                        </div>
                    </motion.div>

                    {/* Bento Item 3 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="col-span-1 md:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 p-8"
                    >
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            <Shield className="w-6 h-6 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Vulnerability detection</h3>
                        <p className="mt-2 text-sm text-slate-500">Uncover hidden security flaws, weak configurations, and edge cases before they make it to production.</p>
                    </motion.div>

                    {/* Bento Item 4 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="col-span-1 md:col-span-8 bg-slate-50 rounded-3xl border border-slate-200 p-8"
                    >
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Actionable refactoring</h3>
                        <p className="mt-2 text-sm text-slate-500">We highlight tech debt and provide clear, prescriptive instructions on how to optimize loops, abstract components, and modernize syntax.</p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
