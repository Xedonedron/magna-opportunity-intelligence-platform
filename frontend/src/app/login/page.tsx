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
    const [loginMode, setLoginMode] = useState<"username" | "google">("username");
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
        if (!googleClientId || loginMode !== "google") return;

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
    }, [googleClientId, loginMode, router]);

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

                {/* Mode Toggle */}
                <div className="flex mb-6 bg-zinc-100 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setLoginMode("username")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMode === "username"
                                ? "bg-white text-zinc-900 shadow"
                                : "text-zinc-600 hover:text-zinc-900"
                            }`}
                    >
                        Username / Password
                    </button>
                    <button
                        type="button"
                        onClick={() => setLoginMode("google")}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMode === "google"
                                ? "bg-white text-zinc-900 shadow"
                                : "text-zinc-600 hover:text-zinc-900"
                            }`}
                    >
                        Google
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center my-6">
                        <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    </div>
                ) : loginMode === "username" ? (
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
                                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors"
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
                                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                        >
                            Login
                        </button>
                    </form>
                ) : (
                    <div className="flex justify-center w-full my-4">
                        <div id="google-signin-btn"></div>
                    </div>
                )}

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