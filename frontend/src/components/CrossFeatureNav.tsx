"use client";

import { motion } from "framer-motion";
import { FileCode2, UserCircle2, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { usePathname } from "next/navigation";

const tools = [
    {
        title: "Code Analysis",
        icon: <FileCode2 className="w-5 h-5 text-indigo-500" />,
        href: "/repo-analysis",
        color: "indigo"
    },
    {
        title: "Profile Review",
        icon: <UserCircle2 className="w-5 h-5 text-blue-500" />,
        href: "/profile-review",
        color: "blue"
    },
    {
        title: "Profile Roast",
        icon: <Flame className="w-5 h-5 text-rose-500" />,
        href: "/profile-roast",
        color: "rose"
    }
];

export function CrossFeatureNav() {
    const pathname = usePathname();
    const otherTools = tools.filter(t => t.href !== pathname);

    return (
        <section className="w-full mt-8 py-8 border-t border-slate-100">
            <div className="flex flex-col items-center gap-8">
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Try our other tools</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Switch to a different analysis module</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {otherTools.map((tool) => (
                        <Link key={tool.href} href={tool.href} className="group">
                            <Card className="p-4 flex items-center justify-between border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-${tool.color}-50 group-hover:scale-110 transition-transform`}>
                                        {tool.icon}
                                    </div>
                                    <span className="font-bold text-slate-700">{tool.title}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1" />
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
