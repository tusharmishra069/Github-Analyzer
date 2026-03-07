'use client';

import React, { useRef } from 'react';
import { toPng } from 'html-to-image';

interface RoastData {
    username: string;
    avatar_url?: string;
    stats: {
        followers: number;
        public_repos: number;
        total_stars: number;
        top_language: string;
    };
    roast: {
        lines: { emoji: string; text: string }[];
        verdict: string;
    };
}

interface RoastCardProps {
    data: RoastData;
}

export default function RoastCard({ data }: RoastCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        if (cardRef.current) {
            try {
                const dataUrl = await toPng(cardRef.current, {
                    backgroundColor: '#0d1117', // GitHub dark background
                    pixelRatio: 2, // High resolution
                });
                const link = document.createElement('a');
                link.download = `${data.username}-brutal-roast.png`;
                link.href = dataUrl;
                link.click();
            } catch (error) {
                console.error('Failed to generate image', error);
                alert('Could not save image. Please try again.');
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 mt-8">
            {/* Target card for html2canvas */}
            <div
                ref={cardRef}
                className="w-full max-w-lg bg-[#0d1117] border border-[#30363d] rounded-xl text-[#c9d1d9] shadow-2xl relative overflow-hidden font-mono"
                style={{
                    fontFamily: "'Courier New', Courier, monospace",
                }}
            >
                {/* Browser Chrome Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-[10px] text-[#8b949e] ml-2 font-mono tracking-wide">github.com/{data.username}</span>
                </div>

                <div className="p-8">
                    {/* Header: User Info */}
                    <div className="flex items-center gap-4 border-b border-[#30363d] pb-6 mb-6">
                        <img
                            src={data.avatar_url || `https://github.com/${data.username}.png`}
                            alt={data.username}
                            className="w-16 h-16 rounded-full border-2 border-[#8b949e]"
                            crossOrigin="anonymous"
                        />
                        <div>
                            <h2 className="text-2xl font-bold text-[#c9d1d9]">@{data.username}</h2>
                            <p className="text-[#8b949e] text-sm">GitHub Profile Roast</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-center">
                            <p className="text-xs text-[#8b949e]">Repos</p>
                            <p className="text-lg font-semibold text-[#58a6ff]">{data.stats.public_repos}</p>
                        </div>
                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-center">
                            <p className="text-xs text-[#8b949e]">Followers</p>
                            <p className="text-lg font-semibold text-[#3fb950]">{data.stats.followers}</p>
                        </div>
                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-center">
                            <p className="text-xs text-[#8b949e]">Stars</p>
                            <p className="text-lg font-semibold text-[#d29922]">{data.stats.total_stars}</p>
                        </div>
                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-center">
                            <p className="text-xs text-[#8b949e]">Top Lang</p>
                            <p className="text-lg font-semibold text-[#f85149] truncate">{data.stats.top_language}</p>
                        </div>
                    </div>

                    {/* The Roast */}
                    <div className="p-4 space-y-2 bg-[#161b22] border border-[#30363d] rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm">🔥</span>
                            <span className="text-xs text-[#8b949e] font-mono">// roast.output — {data.username}</span>
                        </div>
                        {data.roast.lines.map((line, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]">
                                <span className="text-base shrink-0 leading-none mt-0.5">{line.emoji}</span>
                                <span className="text-sm text-[#c9d1d9] leading-relaxed">{line.text}</span>
                            </div>
                        ))}
                        <div className="mt-4 pt-4 border-t border-[#30363d]">
                            <div className="text-xs text-[#8b949e] mb-2 uppercase tracking-wide font-black">
                                🧾 Final Verdict
                            </div>
                            <p className="text-sm text-[#c9d1d9] leading-relaxed">
                                {data.roast.verdict}
                            </p>
                        </div>
                    </div>

                    {/* Footer Brand */}
                    <div className="mt-8 text-center text-xs text-[#8b949e]">
                        <p>🔥 Brutally roasted by AI</p>
                    </div>
                </div>
            </div>

            {/* Share Actions - Will NOT be included in the downloaded image */}
            <button
                onClick={handleShare}
                className="px-6 py-3 bg-[#2ea043] text-white font-semibold rounded-lg shadow hover:bg-[#2c974b] transition duration-200 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
                </svg>
                Save & Share
            </button>
        </div>
    );
}
