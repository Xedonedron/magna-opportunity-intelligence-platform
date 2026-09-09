import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "MOIP - Magna Opportunity Intelligence Platform",
    description: "Internal platform for opportunity management and AI-powered KYC",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        <LanguageProvider>
                            {children}
                            <Toaster position="bottom-right" richColors closeButton />
                        </LanguageProvider>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

