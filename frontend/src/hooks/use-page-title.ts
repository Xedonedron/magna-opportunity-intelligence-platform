"use client";

import { useEffect } from "react";
import { usePageTitleContext } from "@/context/PageTitleContext";

/**
 * Hook to set a dynamic page title in the browser tab.
 * Example:
 *   usePageTitle("Settings"); // Sets tab to "MOIP - Settings"
 *   usePageTitle(`Oppty ${opp.deal_title || opp.company_name}`); // Sets tab to "MOIP - Oppty Microdrama"
 */
export function usePageTitle(title?: string | null) {
    const { setTitle } = usePageTitleContext();

    useEffect(() => {
        if (title !== undefined) {
            setTitle(title);
        }

        return () => {
            setTitle(null);
        };
    }, [title, setTitle]);
}
