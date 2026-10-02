"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { KeyRound, ChevronDown, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { MoipLogo } from "@/components/ui/MoipLogo";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

// Force dynamic rendering to access env vars at runtime
export const dynamic = "force-dynamic";

export default function LoginPage() {
    usePageTitle("Login");
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const { locale } = useLanguage();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleClientId, setGoogleClientId] = useState<string>(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com"
    );

    // Form states
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showManualLogin, setShowManualLogin] = useState(false);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

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
            .then((data) => {
                if (data?.googleClientId) {
                    setGoogleClientId(data.googleClientId);
                }
            })
            .catch(() => { });
    }, [router]);

    const handleCredentialResponse = useCallback(
        async (response: { credential: string }) => {
            setIsLoading(true);
            setError(null);
            try {
                // Send credential to backend
                const { data } = await api.post("/api/auth/google", {
                    credential: response.credential,
                });

                // Store token using data.access_token
                localStorage.setItem("moip_token", data.access_token);
                localStorage.setItem("moip_user", JSON.stringify(data.user));

                // Redirect to dashboard
                router.push("/dashboard");
            } catch (err: any) {
                setError(
                    locale === "id"
                        ? "Login Google gagal. Silakan coba lagi."
                        : "Google login failed. Please try again."
                );
                setIsLoading(false);
            }
        },
        [router, locale]
    );

    const renderGoogleButton = useCallback(() => {
        if (typeof window === "undefined") return;
        if (typeof window.google === "undefined" || !window.google.accounts) return;

        const activeClientId =
            googleClientId ||
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
            "800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com";

        window.google.accounts.id.initialize({
            client_id: activeClientId,
            callback: handleCredentialResponse,
        });

        const buttonContainer = document.getElementById("google-signin-btn");
        if (buttonContainer) {
            buttonContainer.innerHTML = "";
            const parentWidth =
                buttonContainer.parentElement?.clientWidth ||
                buttonContainer.clientWidth ||
                320;
            const buttonWidth = Math.min(Math.max(Math.floor(parentWidth), 200), 400);

            window.google.accounts.id.renderButton(buttonContainer, {
                theme: resolvedTheme === "dark" ? "filled_black" : "outline",
                size: "large",
                width: buttonWidth,
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "left",
            });
            setIsGoogleLoaded(true);
        }
    }, [googleClientId, handleCredentialResponse, resolvedTheme]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (typeof window.google === "undefined") {
            const existingScript = document.querySelector(
                'script[src="https://accounts.google.com/gsi/client"]'
            );
            if (!existingScript) {
                const script = document.createElement("script");
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    renderGoogleButton();
                };
                script.onerror = () => {
                    setError(
                        locale === "id"
                            ? "Gagal memuat Google SDK. Silakan periksa koneksi atau refresh halaman."
                            : "Failed to load Google SDK. Please check your connection or refresh."
                    );
                };
                document.head.appendChild(script);
            } else {
                existingScript.addEventListener("load", () => renderGoogleButton());
            }
        } else {
            renderGoogleButton();
        }

        const timer = setTimeout(renderGoogleButton, 300);
        return () => clearTimeout(timer);
    }, [renderGoogleButton, locale]);

    // Re-render Google button when window resizes (mobile rotation, viewport change)
    useEffect(() => {
        let timer: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                renderGoogleButton();
            }, 200);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, [renderGoogleButton]);

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
            setError(
                err.response?.data?.detail ||
                (locale === "id"
                    ? "Login gagal. Periksa kembali username dan password Anda."
                    : "Login failed. Please check your username and password.")
            );
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.2),rgba(0,0,0,0))] p-4 relative transition-colors">
            {/* Top Bar Utilities */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
                {/* Branding */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <MoipLogo variant="full" layout="vertical" size="lg" showTagline={true} />
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* 1. Primary Button: Login with Google */}
                <div className="w-full flex flex-col items-center">
                    <div
                        id="google-signin-btn-container"
                        className="w-full flex justify-center items-center min-h-[44px] overflow-hidden"
                    >
                        {!isGoogleLoaded && (
                            <div className="w-full h-[44px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse flex items-center justify-center border border-zinc-200 dark:border-zinc-700/60">
                                <span className="text-xs text-zinc-400">
                                    {locale === "id" ? "Memuat Google Sign-In..." : "Loading Google Sign-In..."}
                                </span>
                            </div>
                        )}
                        <div
                            id="google-signin-btn"
                            className={cn(
                                "w-full flex justify-center [&>div]:!w-full [&>div]:!flex [&>div]:!justify-center [&_iframe]:!max-w-full",
                                !isGoogleLoaded && "hidden"
                            )}
                        />
                    </div>
                </div>

                {/* Divider: ATAU */}
                <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400 dark:text-zinc-500 font-medium tracking-wider">
                            {locale === "id" ? "atau" : "or"}
                        </span>
                    </div>
                </div>

                {/* 2. Secondary Button: Toggle Form Username & Password */}
                <button
                    type="button"
                    onClick={() => setShowManualLogin((prev) => !prev)}
                    className="w-full py-2.5 px-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/70 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs cursor-pointer"
                    aria-expanded={showManualLogin}
                >
                    <div className="flex items-center gap-2.5">
                        <KeyRound className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
                        <span>
                            {locale === "id"
                                ? "Gunakan Username & Password"
                                : "Use Username & Password"}
                        </span>
                    </div>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 text-zinc-400 transition-transform duration-300 ease-in-out",
                            showManualLogin && "rotate-180 text-zinc-700 dark:text-zinc-200"
                        )}
                    />
                </button>

                {/* 3. Expandable Form Username & Password (Hidden by Default, Smooth Expand Animation) */}
                <div
                    className={cn(
                        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
                        showManualLogin
                            ? "grid-rows-[1fr] opacity-100 mt-4 pointer-events-auto"
                            : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                    )}
                >
                    <div className="overflow-hidden">
                        <form onSubmit={handleUsernameLogin} className="space-y-4 pt-1">
                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                                >
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-3.5 py-2.5 sm:py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors disabled:bg-zinc-100 dark:disabled:bg-zinc-800/50 disabled:cursor-not-allowed placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm sm:text-base"
                                    placeholder={locale === "id" ? "Masukkan username" : "Enter username"}
                                    required={showManualLogin}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-colors disabled:bg-zinc-100 dark:disabled:bg-zinc-800/50 disabled:cursor-not-allowed placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm sm:text-base"
                                        placeholder={locale === "id" ? "Masukkan kata sandi" : "Enter password"}
                                        required={showManualLogin}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 sm:py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-700 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                                        <span>
                                            {locale === "id" ? "Memproses..." : "Logging in..."}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        <span>
                                            {locale === "id" ? "Masuk" : "Sign In"}
                                        </span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <p className="mt-6 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    {locale === "id" ? (
                        <>
                            Dengan login, Anda menyetujui{" "}
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                Syarat & Ketentuan
                            </span>{" "}
                            yang berlaku.
                        </>
                    ) : (
                        <>
                            By continuing, you agree to our{" "}
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                Terms & Conditions
                            </span>
                            .
                        </>
                    )}
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
