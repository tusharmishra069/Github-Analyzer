"use client";

import { motion } from "framer-motion";
import {
    LayoutDashboard,
    FileCode2,
    UserCircle2,
    Flame,
    ArrowRight,
    Sparkles,
    Shield,
    Zap,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const modules = [
    {
        title: "Codebase Analysis",
        description: "Deep dive into any repository. Get health scores, architecture maps, and high-severity bug reports.",
        icon: <FileCode2 className="w-8 h-8 text-indigo-500" />,
        href: "/repo-analysis",
        color: "indigo",
        badge: "Deep Analysis",
        features: ["Sub-system analysis", "Vulnerability detection", "Architecture maps"]
    },
    {
        title: "Profile Review",
        description: "Professional GitHub profile analysis. Evaluate hireability, tech stack breadth, and skills.",
        icon: <UserCircle2 className="w-8 h-8 text-blue-500" />,
        href: "/profile-review",
        color: "blue",
        badge: "Career Tool",
        features: ["Hireability score", "Skill visualization", "Portfolio audit"]
    },
    {
        title: "Profile Roast",
        description: "Brutal honesty for your code ego. Let our AI ruthlessly judge your public repositories.",
        icon: <Flame className="w-8 h-8 text-rose-500" />,
        href: "/profile-roast",
        color: "rose",
        badge: "Just for Fun",
        features: [" Ruthless AI", "Spaghetti code detector", "Ego destruction"]
    }
];

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-grid-white relative overflow-x-hidden flex flex-col">
            <Navbar />

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-24 relative z-10">
                <header className="mb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-sm text-sm font-medium text-slate-600 mb-6"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Select an Analysis Module</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 mb-4"
                    >
                        Your AI <span className="text-indigo-600">Launchpad</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-500 max-w-2xl mx-auto"
                    >
                        Choose the right tool for your next mission. Whether it's deep-diving into codebases or roasting your profile, we've got you covered.
                    </motion.p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modules.map((module, idx) => (
                        <motion.div
                            key={module.title}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.1 * (idx + 3) }}
                        >
                            <Link href={module.href} className="group h-full block">
                                <Card className="h-full border-slate-200/80 shadow-lg hover:shadow-xl hover:border-indigo-200 transition-all duration-300 relative overflow-hidden flex flex-col">
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${module.color}-50/50 rounded-bl-full pointer-events-none transition-colors group-hover:bg-${module.color}-100/50`} />

                                    <CardHeader className="relative z-10 pb-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300`}>
                                                {module.icon}
                                            </div>
                                            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md bg-${module.color}-50 text-${module.color}-600 border border-${module.color}-100/50`}>
                                                {module.badge}
                                            </span>
                                        </div>
                                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {module.title}
                                        </CardTitle>
                                        <CardDescription className="text-slate-500 font-medium leading-relaxed">
                                            {module.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="relative z-10 flex-1 flex flex-col justify-between pt-0">
                                        <ul className="space-y-2 mt-2">
                                            {module.features.map((feature) => (
                                                <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                                    <Zap className="w-3 h-3 text-indigo-400" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between text-indigo-600 font-bold text-sm">
                                            <span>Enter Module</span>
                                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-24 p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="max-w-md">
                            <h2 className="text-2xl font-bold tracking-tight mb-3 flex items-center gap-2">
                                <TrendingUp className="w-6 h-6 text-indigo-400" />
                                More Coming Soon
                            </h2>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                We're building new AI agents to help you ship better code, faster. Stay tuned for Team Analysis, PR Auditor, and Document Generator.
                            </p>
                        </div>
                        <Button className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-8 font-bold">
                            View Roadmap
                        </Button>
                    </div>
                </motion.section>
            </main>

            <Footer />
        </div>
    );
}
