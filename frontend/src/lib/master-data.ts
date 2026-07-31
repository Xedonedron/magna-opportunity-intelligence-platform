import { api } from "@/lib/api";

export const DEFAULT_INDUSTRIES = [
    "Finance & Banking",
    "Insurance",
    "Manufacturing",
    "Healthcare",
    "Telecommunications",
    "Retail & E-commerce",
    "Government",
    "Technology & SaaS",
];

export const DEFAULT_PRESALES = [
    "Devi",
    "Robi",
    "Gerry",
];

export function getMasterIndustries(): string[] {
    if (typeof window === "undefined") return DEFAULT_INDUSTRIES;
    const stored = localStorage.getItem("moip_master_industries");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Failed to parse moip_master_industries", e);
        }
    }
    return DEFAULT_INDUSTRIES;
}

export function getMasterPresales(): string[] {
    if (typeof window === "undefined") return DEFAULT_PRESALES;
    const stored = localStorage.getItem("moip_master_presales");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Failed to parse moip_master_presales", e);
        }
    }
    return DEFAULT_PRESALES;
}

export async function fetchMasterData(): Promise<{ industries: string[]; presales: string[] }> {
    try {
        const res = await api.get("/api/admin/master-data");
        if (res.data) {
            const { industries, presales } = res.data;
            if (Array.isArray(industries) && typeof window !== "undefined") {
                localStorage.setItem("moip_master_industries", JSON.stringify(industries));
            }
            if (Array.isArray(presales) && typeof window !== "undefined") {
                localStorage.setItem("moip_master_presales", JSON.stringify(presales));
            }
            return {
                industries: industries || DEFAULT_INDUSTRIES,
                presales: presales || DEFAULT_PRESALES,
            };
        }
    } catch (e) {
        console.warn("Using default local master data", e);
    }

    return {
        industries: getMasterIndustries(),
        presales: getMasterPresales(),
    };
}

export async function updateMasterData(payload: {
    industries: string[];
    presales: string[];
}): Promise<void> {
    if (typeof window !== "undefined") {
        localStorage.setItem("moip_master_industries", JSON.stringify(payload.industries));
        localStorage.setItem("moip_master_presales", JSON.stringify(payload.presales));
    }
    try {
        await api.post("/api/admin/master-data", payload);
    } catch (e) {
        console.warn("Backend update failed, saved to local storage", e);
    }
}
