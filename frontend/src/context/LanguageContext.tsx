"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { en, type Locale, type Translations } from "@/locales/en";
import { id } from "@/locales/id";

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Translations;
}

const translations: Record<Locale, Translations> = {
    en,
    id,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("id"); // Default to Indonesian for ID audience or EN

    useEffect(() => {
        const savedLocale = localStorage.getItem("moip_locale") as Locale | null;
        if (savedLocale && (savedLocale === "en" || savedLocale === "id")) {
            setLocaleState(savedLocale);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem("moip_locale", newLocale);
        document.documentElement.lang = newLocale;
    };

    return (
        <LanguageContext.Provider
            value={{
                locale,
                setLocale,
                t: translations[locale],
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
