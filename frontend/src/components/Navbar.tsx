"use client";

import { motion } from "framer-motion";
import { Command, Github } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function useSmoothScrollTo(id: string) {
    const pathname = usePathname();
    const router = useRouter();

    return (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const scroll = () => {
            const el = document.getElementById(id);
            if (el) {
                const navbarHeight = 64; // h-16
                const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
                window.scrollTo({ top, behavior: "smooth" });
            }
        };

        if (pathname === "/") {
            scroll();
        } else {
            // Navigate home first, then scroll once the page has loaded
            router.push("/");
            // Give Next.js time to mount the page
            setTimeout(scroll, 400);
        }
    };
}

export function Navbar() {
    const scrollToFeatures = useSmoothScrollTo("features");
    const scrollToPricing  = useSmoothScrollTo("pricing");

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200"
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-xl tracking-tight">
                    <Command className="w-6 h-6" />
                    <span>CodeAnalyzer</span>
                </Link>

                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                    <a href="/#features" onClick={scrollToFeatures} className="hover:text-slate-900 transition-colors cursor-pointer">Features</a>
                    <a href="/#pricing" onClick={scrollToPricing} className="hover:text-slate-900 transition-colors cursor-pointer">Pricing</a>
                    <Link href="/repo-analysis" className="hover:text-slate-900 transition-colors">Code Analysis</Link>
                    <Link href="/profile-review" className="hover:text-slate-900 transition-colors">Profile Review</Link>
                    <Link href="/profile-roast" className="hover:text-slate-900 transition-colors">Roast</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <a href="https://github.com/tusharmishra069/CodeBase-Analyzer" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <Github className="w-5 h-5" />
                    </a>
                    <Link href="/repo-analysis">
                        <Button className="rounded-full px-6 font-semibold bg-slate-900 text-white hover:bg-slate-800">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.header>
    );
}
