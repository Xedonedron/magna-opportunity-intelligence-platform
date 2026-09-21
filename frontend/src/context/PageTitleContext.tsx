"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

export const APP_PREFIX = "MOIP - ";
export const DEFAULT_PAGE_TITLE = "MOIP - Magna Opportunity Intelligence Platform";

interface PageTitleContextType {
    title: string | null;
    setTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export function getRouteDefaultTitle(pathname: string): string | null {
    if (!pathname) return null;
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/opportunities") return "Opportunities";
    if (pathname === "/opportunities/create") return "New Opportunity";
    if (pathname === "/opportunities/import") return "Import Opportunities";
    if (/^\/opportunities\/[^/]+$/.test(pathname)) return "Opportunity Details";
    if (pathname === "/meetings") return "Meetings";
    if (pathname === "/notifications") return "Notifications";
    if (pathname === "/settings") return "Settings";
    if (pathname === "/login") return "Login";
    return null;
}

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [customTitle, setCustomTitle] = useState<string | null>(null);

    // Reset custom title when user navigates to a different route
    useEffect(() => {
        setCustomTitle(null);
    }, [pathname]);

    // Compute effective title
    const effectiveTitle = useMemo(() => {
        if (customTitle && customTitle.trim()) {
            const trimmed = customTitle.trim();
            return trimmed.startsWith(APP_PREFIX) ? trimmed : `${APP_PREFIX}${trimmed}`;
        }

        const routeDefault = getRouteDefaultTitle(pathname);
        if (routeDefault) {
            return `${APP_PREFIX}${routeDefault}`;
        }

        return DEFAULT_PAGE_TITLE;
    }, [customTitle, pathname]);

    // Update document.title on client
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.title = effectiveTitle;
        }
    }, [effectiveTitle]);

    return (
        <PageTitleContext.Provider
            value={{
                title: customTitle,
                setTitle: setCustomTitle,
            }}
        >
            {children}
        </PageTitleContext.Provider>
    );
}

export function usePageTitleContext() {
    const context = useContext(PageTitleContext);
    if (!context) {
        throw new Error("usePageTitleContext must be used within a PageTitleProvider");
    }
    return context;
}
