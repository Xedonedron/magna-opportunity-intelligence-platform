"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send,
    Sparkles,
    User,
    Brain,
    AlertCircle,
    X,
    Maximize2,
    Minimize2,
    CalendarDays,
    Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
    created_at?: string;
}

interface OpportunityChatSidebarProps {
    opportunityId: string;
    isOpen: boolean;
    onClose: () => void;
}

const SUGGESTIONS = [
    "Buatkan agenda rapat 5 poin untuk pertemuan perdana.",
    "Apa saja pain points utama perusahaan ini terkait Tableau?",
    "Bagaimana memposisikan Google Cloud / BigQuery untuk klien ini?",
    "Tolong ringkas kelemahan dan peluang dari laporan KYC."
];

// Helper to parse basic Markdown safely using Regex
function renderMarkdown(text: string) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-zinc-900 mt-3 mb-1.5">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-zinc-900 mt-4 mb-2">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-bold text-zinc-900 mt-5 mb-2">$1</h2>');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-zinc-950">$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong class="font-bold text-zinc-950">$1</strong>');

    // Italic (*text* or _text_)
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-800">$1</em>');
    html = html.replace(/_(.*?)_/g, '<em class="italic text-zinc-800">$1</em>');

    // Lists (bullet points)
    const lines = html.split("\n");
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("- ") || line.startsWith("* ")) {
            const content = line.substring(2);
            let newLine = `<li class="ml-4 list-disc pl-0.5 text-zinc-800 my-1">${content}</li>`;
            if (!inList) {
                newLine = `<ul class="space-y-0.5 my-2">${newLine}`;
                inList = true;
            }
            lines[i] = newLine;
        } else {
            if (inList) {
                lines[i] = `</ul>${lines[i]}`;
                inList = false;
            }
        }
    }
    if (inList) {
        lines[lines.length - 1] = `${lines[lines.length - 1]}</ul>`;
    }
    html = lines.join("\n");

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function OpportunityChatSidebar({
    opportunityId,
    isOpen,
    onClose,
}: OpportunityChatSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Fetch history from DB when sidebar is opened
    useEffect(() => {
        if (!isOpen) return;

        async function fetchHistory() {
            setIsLoadingHistory(true);
            setError(null);
            try {
                const { data } = await api.get(`/api/opportunities/${opportunityId}/chat`);
                if (data && data.messages) {
                    if (data.messages.length === 0) {
                        // Insert welcome message if no history exists yet
                        setMessages([
                            {
                                role: "assistant",
                                content: "Halo! Saya Asisten Pre-sales AI Anda. Saya telah mempelajari detail peluang dan laporan KYC terbaru untuk klien ini. Silakan tanyakan apa saja atau pilih saran brainstorming di bawah untuk memulai!"
                            }
                        ]);
                    } else {
                        setMessages(data.messages);
                    }
                }
            } catch (err: any) {
                console.error("[Get Chat History Error]", err);
                setError("Gagal memuat riwayat obrolan.");
            } finally {
                setIsLoadingHistory(false);
            }
        }

        fetchHistory();
    }, [opportunityId, isOpen]);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (textToSend: string) => {
        if (!textToSend.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: textToSend };
        
        // Append user message immediately locally
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        setError(null);

        // Load custom AI settings from localStorage
        let aiModel = undefined;
        let aiTemp = undefined;
        try {
            const stored = localStorage.getItem("moip_ai_settings");
            if (stored) {
                const parsed = JSON.parse(stored);
                aiModel = parsed.model;
                aiTemp = parsed.temperature;
            }
        } catch (e) {
            console.error("Failed to parse custom AI settings", e);
        }

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${baseUrl}/api/opportunities/${opportunityId}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("moip_token") || ""}`,
                },
                body: JSON.stringify({
                    message: textToSend,
                    model: aiModel,
                    temperature: aiTemp,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: "Gagal mengirim pesan." }));
                throw new Error(errData.detail || "Gagal mengirim pesan.");
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Gagal menginisialisasi pembaca stream.");

            const decoder = new TextDecoder();
            let assistantContent = "";

            // Insert empty assistant message first
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;

                // Update the last message in state
                setMessages((prev) => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                        updated[updated.length - 1] = {
                            role: "assistant",
                            content: assistantContent,
                        };
                    }
                    return updated;
                });
            }
        } catch (err: any) {
            console.error("[Chat API Error]", err);
            setError(err.message || "Gagal mendapatkan respon dari AI. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`border-l border-zinc-200 bg-zinc-50 flex flex-col h-full shrink-0 transition-all duration-300 relative ${
                isWide ? "w-[650px]" : "w-[400px]"
            }`}
        >
            {/* Header */}
            <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-zinc-950 text-white shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-900 truncate">Chat with AI</h3>
                        <p className="text-[10px] text-zinc-500 font-medium truncate">Magna Pre-sales Assistant</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Toggle Width Button */}
                    <button
                        onClick={() => setIsWide(!isWide)}
                        title={isWide ? "Perkecil Panel" : "Perbesar Panel"}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                    >
                        {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        title="Tutup Obrolan"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Disclaimer & Info Bar */}
            <div className="bg-zinc-100 border-b border-zinc-200/80 px-4 py-2 flex items-center gap-2 shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] text-zinc-600 font-medium leading-tight">
                    Riwayat obrolan disimpan otomatis dan akan kedaluwarsa setelah 7 hari.
                </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingHistory ? (
                    <div className="space-y-4 pt-12">
                        <div className="h-6 w-3/4 bg-zinc-200/80 rounded animate-pulse mx-auto" />
                        <div className="h-16 w-5/6 bg-zinc-200/80 rounded animate-pulse mx-auto" />
                        <div className="h-10 w-2/3 bg-zinc-200/80 rounded animate-pulse mx-auto" />
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            return (
                                <div
                                    key={index}
                                    className={`flex gap-2.5 max-w-[90%] ${
                                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-sm text-xs ${
                                            isUser
                                                ? "bg-zinc-950 text-white border-zinc-950"
                                                : "bg-zinc-100 text-zinc-800 border-zinc-200"
                                        }`}
                                    >
                                        {isUser ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                                    </div>
                                    <div
                                        className={`p-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                                            isUser
                                                ? "bg-zinc-950 text-white"
                                                : "bg-white border border-zinc-200 text-zinc-800"
                                        }`}
                                    >
                                        {renderMarkdown(msg.content)}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="flex gap-2.5 max-w-[80%] mr-auto items-center">
                                <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 animate-pulse">
                                    <Brain className="w-3.5 h-3.5 text-zinc-400" />
                                </div>
                                <div className="bg-white border border-zinc-200 p-3 rounded-xl shadow-sm flex items-center gap-1 py-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex gap-2 bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 items-center justify-center">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            {/* Suggestions & Input Panel */}
            <div className="bg-white border-t border-zinc-200 p-4 space-y-3.5 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                {/* Suggestions list (visible only when there's no chat history beyond welcome message) */}
                {messages.length <= 1 && !isLoadingHistory && (
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Rekomendasi pertanyaan:
                        </p>
                        <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {SUGGESTIONS.map((sug, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(sug)}
                                    className="text-xs text-left text-zinc-600 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 p-2 py-2 px-3 rounded-md transition-colors whitespace-normal break-words h-auto"
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(input);
                    }}
                    className="flex gap-2"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Tanyakan posisioning, arsitektur, dll..."
                        className="flex-1 h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                        disabled={isLoading || isLoadingHistory}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || isLoadingHistory || !input.trim()}
                        className="shrink-0 h-9 px-3 gap-1.5 text-xs font-semibold"
                    >
                        <Send className="w-3.5 h-3.5" /> Kirim
                    </Button>
                </form>
            </div>
        </div>
    );
}
