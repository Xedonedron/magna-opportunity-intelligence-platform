"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FolderOpen, Calendar, X, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/domains/notifications/NotificationDropdown";
import { api } from "@/lib/api";

interface SearchResult {
    opportunities: Array<{ id: string; company_name: string; product: string | null; status: string }>;
    meetings: Array<{ id: string; title: string; company_name: string; opportunity_id: string; date: string }>;
}

export function TopNav({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus input on Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === "Escape") {
                setIsOpen(false);
                setIsMobileSearchOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Fetch search results on query change
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults(null);
            setIsOpen(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get<SearchResult>(
                    `/api/opportunities/search/global?q=${encodeURIComponent(query)}`
                );
                setResults(data);
                setIsOpen(true);
            } catch (err) {
                console.error("Gagal melakukan pencarian global", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNavigate = (path: string) => {
        router.push(path);
        setIsOpen(false);
        setIsMobileSearchOpen(false);
        setQuery("");
    };

    return (
        <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
            {/* Hamburger button for mobile */}
            <button
                onClick={onOpenMobileMenu}
                className="p-2 -ml-1 mr-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-md md:hidden"
                aria-label="Open Mobile Menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center flex-1 relative" ref={containerRef}>
                {/* Desktop Search Bar */}
                <div className="relative w-96 hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
                        placeholder="Cari peluang atau rapat... (Ctrl+K)"
                        className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white transition-colors"
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery("");
                                setResults(null);
                            }}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Mobile Search Toggle Icon */}
                <button
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                    className="p-2 text-zinc-600 hover:text-zinc-950 md:hidden"
                    aria-label="Toggle Search"
                >
                    <Search className="w-5 h-5" />
                </button>

                {/* Mobile Expandable Search Bar */}
                {isMobileSearchOpen && (
                    <div className="absolute left-0 right-0 top-0 bottom-0 bg-white flex items-center z-30 md:hidden">
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <input
                                autoFocus
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cari peluang atau rapat..."
                                className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs outline-none"
                            />
                            <button
                                onClick={() => {
                                    setIsMobileSearchOpen(false);
                                    setQuery("");
                                }}
                                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Dropdown Results */}
                {isOpen && results && (
                    <div className="absolute top-11 left-0 w-full sm:w-96 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-[380px] overflow-y-auto z-50 p-2 space-y-3">
                        {/* Opportunities section */}
                        <div>
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> Opportunities
                            </h4>
                            {results.opportunities.length === 0 ? (
                                <p className="text-xs text-zinc-500 px-2 py-1">Tidak ada peluang cocok.</p>
                            ) : (
                                <div className="space-y-0.5 mt-1">
                                    {results.opportunities.map((opp) => (
                                        <button
                                            key={opp.id}
                                            onClick={() => handleNavigate(`/opportunities/${opp.id}`)}
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-50 rounded-md transition-colors block text-xs"
                                        >
                                            <p className="font-semibold text-zinc-900">{opp.company_name}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {opp.product || "No Product"} •{" "}
                                                <span className="font-medium text-zinc-600">{opp.status}</span>
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Meetings section */}
                        <div className="border-t border-zinc-100 pt-2">
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Meetings
                            </h4>
                            {results.meetings.length === 0 ? (
                                <p className="text-xs text-zinc-500 px-2 py-1">Tidak ada rapat cocok.</p>
                            ) : (
                                <div className="space-y-0.5 mt-1">
                                    {results.meetings.map((meet) => (
                                        <button
                                            key={meet.id}
                                            onClick={() =>
                                                handleNavigate(
                                                    `/opportunities/${meet.opportunity_id}?tab=meetings`
                                                )
                                            }
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-50 rounded-md transition-colors block text-xs"
                                        >
                                            <p className="font-semibold text-zinc-900">{meet.title}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {meet.company_name} •{" "}
                                                {new Date(meet.date).toLocaleDateString("id-ID")}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <NotificationDropdown />
            </div>
        </header>
    );
}