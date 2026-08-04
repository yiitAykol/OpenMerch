"use client";

import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL;

// Base URL'i ve Authorization başlığını otomatik ekleyen fetch sarmalayıcı.
// Kullanımı: const apiFetch = useApi();  →  apiFetch("/api/products", { method: "DELETE" })
export function useApi() {
    const { token } = useAuth();

    return useCallback(
        async (path: string, options: RequestInit = {}) => {
            const headers = new Headers(options.headers);
            headers.set("Content-Type", "application/json");
            if (token) headers.set("Authorization", `Bearer ${token}`);

            return fetch(`${API}${path}`, { ...options, headers });
        },
        [token]
    );
}
