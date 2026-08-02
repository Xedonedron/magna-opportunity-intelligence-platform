import axios from "axios";
import type {
    Meeting,
    MeetingListResponse,
    MeetingCreatePayload,
    MeetingUpdatePayload,
} from "@/types/meeting";

export const getClientBaseUrl = () => {
    if (typeof window !== "undefined") {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        const { protocol, hostname } = window.location;

        // If explicitly set and not generic localhost fallback on a real domain
        if (envUrl && envUrl !== "http://localhost:8009") {
            return envUrl;
        }

        // On localhost/127.0.0.1 development
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return envUrl || `${protocol}//${hostname}:8009`;
        }

        // In production VM/Domain deployment (e.g. moip.cloudwithmagna.com),
        // Nginx proxies /api on the same origin (HTTPS port 443)
        return `${protocol}//${hostname}`;
    }
    return process.env.INTERNAL_API_URL || "http://backend:8000";
};

const API_BASE_URL = getClientBaseUrl();

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("moip_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("moip_token");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

// --- Meeting API ---
export const meetingApi = {
    list: async (opportunityId?: string): Promise<MeetingListResponse> => {
        const params = opportunityId ? { opportunity_id: opportunityId } : {};
        const { data } = await api.get("/api/meetings", { params });
        return data;
    },
    get: async (id: string): Promise<Meeting> => {
        const { data } = await api.get(`/api/meetings/${id}`);
        return data;
    },
    create: async (payload: MeetingCreatePayload): Promise<Meeting> => {
        const { data } = await api.post("/api/meetings", payload);
        return data;
    },
    update: async (
        id: string,
        payload: MeetingUpdatePayload
    ): Promise<Meeting> => {
        const { data } = await api.put(`/api/meetings/${id}`, payload);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/meetings/${id}`);
    },
};
