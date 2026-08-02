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

        // On localhost/127.0.0.1 development
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return envUrl || `${protocol}//${hostname}:8009`;
        }

        // On production domain (e.g. moip.cloudwithmagna.com):
        // If envUrl is explicitly set and is a custom external domain (not internal backend port :8009/:8000/localhost)
        if (
            envUrl &&
            !envUrl.includes(":8009") &&
            !envUrl.includes(":8000") &&
            !envUrl.includes("localhost")
        ) {
            return envUrl.replace(/\/$/, "");
        }

        // Standard production VM/Domain deployment (e.g. moip.cloudwithmagna.com)
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
