"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// Force dynamic rendering to access env vars at runtime
export const dynamic = "force-dynamic";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleClientId, setGoogleClientId] = useState<string>("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        // Check if already logged in
        const token = localStorage.getItem("moip_token");
        if (token) {
            router.push("/dashboard");
            return;
        }
        // Fetch Google Client ID from server at runtime
        fetch("/api/config")
            .then((res) => res.json())
            .then((data) => setGoogleClientId(data.googleClientId))
            .catch(() => { });
    }, [router]);

    useEffect(() => {
        if (!googleClientId) return;

        const handleCredentialResponse = async (response: { credential: string }) => {
            setIsLoading(true);
            setError(null);
            try {
                // Send credential to backend
                const { data } = await api.post("/api/auth/google", {
                    credential: response.credential,
                });

                // Store token using data.access_token instead of data.token
                localStorage.setItem("moip_token", data.access_token);
                localStorage.setItem("moip_user", JSON.stringify(data.user));

                // Redirect to dashboard
                router.push("/dashboard");
            } catch (err) {
                setError("Login gagal. Silakan coba lagi.");
                setIsLoading(false);
            }
        };

        const initGoogleAuth = () => {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleCredentialResponse,
            });

            const buttonContainer = document.getElementById("google-signin-btn");
            if (buttonContainer) {
                window.google.accounts.id.renderButton(buttonContainer, {
                    theme: "outline",
                    size: "large",
                    width: 384,
                });
            }
        };

        if (typeof window.google === "undefined") {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = initGoogleAuth;
            script.onerror = () => setError("Gagal memuat Google SDK. Silakan refresh halaman.");
            document.head.appendChild(script);
        } else {
            initGoogleAuth();
        }
    }, [googleClientId, router]);

    const handleUsernameLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data } = await api.post("/api/auth/login", {
                username,
                password,
            });

            localStorage.setItem("moip_token", data.access_token);
            localStorage.setItem("moip_user", JSON.stringify(data.user));

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Login gagal. Silakan coba lagi.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 mb-2">
                        MOIP
                    </h1>
                    <p className="text-zinc-600">
                        Magna Opportunity Intelligence Platform
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleUsernameLogin} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-zinc-700 mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors disabled:bg-zinc-100 disabled:cursor-not-allowed"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors disabled:bg-zinc-100 disabled:cursor-not-allowed"
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-700 disabled:cursor-not-allowed"
                    >
                        {isLoading && (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        <span>{isLoading ? "Logging in..." : "Login"}</span>
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-500 font-medium">atau</span>
                    </div>
                </div>

                <div className="flex justify-center w-full min-h-[44px]">
                    <div id="google-signin-btn"></div>
                </div>

                <p className="mt-6 text-center text-sm text-zinc-500">
                    Dengan login, Anda menyetujui{" "}
                    <span className="text-zinc-700">Syarat & Ketentuan</span> yang berlaku.
                </p>
            </div>
        </div>
    );
}

// Google Identity Services types
interface GooglePromptNotification {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
}

interface GoogleAccountsId {
    initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
    }) => void;
    prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
    renderButton: (parent: HTMLElement, options: any) => void;
}

interface GoogleAccounts {
    id: GoogleAccountsId;
}

interface GoogleWindow {
    accounts: GoogleAccounts;
}

declare global {
    interface Window {
        google: GoogleWindow;
    }
}