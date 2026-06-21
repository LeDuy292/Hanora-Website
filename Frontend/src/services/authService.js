import { apiRequest, setToken, clearToken, getToken } from "./apiClient";

export { getToken };

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const authApi = {
  login: async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if (data?.token) {
      setToken(data.token);
    }

    return data;
  },

  register: async (username, email, password) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });

    if (data?.token) {
      setToken(data.token);
    }

    return data;
  },

  googleLogin: async (idToken) => {
    const data = await apiRequest("/auth/google", {
      method: "POST",
      body: { idToken },
    });

    if (data?.token) {
      setToken(data.token);
    }

    return data;
  },

  logout: () => {
    clearToken();
  },

  me: async () => {
    return apiRequest("/auth/me", { auth: true });
  },
};

export function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Identity Services can only be loaded in the browser."),
    );
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById("google-identity-script");
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services script.")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services script."));
    document.head.appendChild(script);
  });
}
