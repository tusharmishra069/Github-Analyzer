"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pricing() {
    return (
        <section id="pricing" className="py-32 bg-slate-50 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Scan without limits</h2>
                    <p className="text-lg text-slate-500">Flexible plans tailored for solo developers, open-source maintainers, and enterprise teams.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            name: "Hobby",
                            price: "Free",
                            type: "forever",
                            desc: "Perfect for indie developers and small personal repositories.",
                            button: "Start Free",
                            features: ["Up to 5 repos / month", "Max 10,000 LOC per scan", "Basic vulnerability checks", "Community forum access"]
                        },
                        {
                            name: "Pro",
                            price: "$29",
                            type: "month",
                            desc: "For growing teams needing deep architectural insights.",
                            button: "Get Pro",
                            highlight: true,
                            features: ["Unlimited repo scans", "Max 1M LOC per scan", "Advanced architectural maps", "Priority email support", "Custom rulesets"]
                        },
                        {
                            name: "Enterprise",
                            price: "Custom",
                            type: "org",
                            desc: "On-premise deployment and dedicated ML model fine-tuning.",
                            button: "Contact Sales",
                            features: ["Self-hosted deployment", "Unlimited LOC", "SSO & SAML integration", "Dedicated account manager", "Fine-tuned models"]
                        }
                    ].map((tier, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`bg-white rounded-3xl p-8 border ${tier.highlight ? 'border-primary ring-4 ring-primary/5' : 'border-slate-200'} shadow-sm relative overflow-hidden flex flex-col`}
                        >
                            {tier.highlight && (
                                <div className="absolute top-4 right-4 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    Popular
                                </div>
                            )}
                            <h3 className="text-xl font-semibold text-slate-900">{tier.name}</h3>
                            <div className="mt-4 flex items-baseline text-5xl font-black text-slate-900">
                                {tier.price}
                                <span className="text-lg font-medium text-slate-400 ml-1">/{tier.type}</span>
                            </div>
                            <p className="mt-4 text-sm text-slate-500">{tier.desc}</p>
                            <Button className={`w-full mt-8 rounded-full h-12 font-semibold ${tier.highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                                {tier.button}
                            </Button>
                            <ul className="mt-8 space-y-4 flex-1">
                                {tier.features.map((feat, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                                        <div className="rounded-full bg-slate-100 p-1 flex-shrink-0">
                                            <Check className="w-3 h-3 text-slate-900" />
                                        </div>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
