import { Command, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-12 md:py-16">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xl tracking-tight mb-4">
                        <Command className="w-6 h-6" />
                        <span>CodeAnalyzer</span>
                    </div>
                    <p className="text-slate-500 max-w-sm">
                        Paste your GitHub link, and let our AI models handle the complex code reviews and architecture analysis.
                    </p>
                    <div className="flex items-center gap-4 mt-6">
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Twitter className="w-5 h-5" /></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Github className="w-5 h-5" /></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Linkedin className="w-5 h-5" /></a>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
                    <ul className="space-y-3">
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Features</a></li>
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Pricing</a></li>
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Changelog</a></li>
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Documentation</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
                    <ul className="space-y-3">
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Privacy Policy</a></li>
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Terms of Service</a></li>
                        <li><a href="#" className="text-slate-500 hover:text-slate-900 text-sm">Cookie Policy</a></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-6 mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
                <p>© 2026 CodeAnalyzer Inc. All rights reserved.</p>
                <p className="mt-2 md:mt-0 flex items-center gap-1">Designed with AI precision.</p>
            </div>
        </footer>
    );
}
