const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bogcat_token");
}

export function setToken(token: string) {
  localStorage.setItem("bogcat_token", token);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bogcat_role");
}

export function setRole(role: string) {
  localStorage.setItem("bogcat_role", role);
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bogcat_userId");
}

export function setUserId(userId: string) {
  localStorage.setItem("bogcat_userId", userId);
}

export function clearAuth() {
  localStorage.removeItem("bogcat_token");
  localStorage.removeItem("bogcat_role");
  localStorage.removeItem("bogcat_userId");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // If session was revoked (force logout) or token expired, redirect to login
    // Skip for /auth/login — a 401 there means wrong credentials, not session revoked
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/login")) {
      clearAuth();
      window.location.href = "/";
      throw new Error("Session expired");
    }
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    apiFetch("/auth/logout", { method: "POST" }),

  getColleagues: () => apiFetch("/colleagues"),

  getTodayWorkingDay: () => apiFetch("/working-days/today"),

  setTodayColleagues: (colleagueIds: string[]) =>
    apiFetch("/working-days/today/colleagues", {
      method: "POST",
      body: JSON.stringify({ colleagueIds }),
    }),

  assignTask: (payload: { colleagueId: string; taskType: string; workingDayId: string }) =>
    apiFetch("/tasks/assign", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  completeTask: (id: string) =>
    apiFetch(`/tasks/${id}/complete`, { method: "POST" }),

  extendTask: (id: string, extraMins: number) =>
    apiFetch(`/tasks/${id}/extend`, {
      method: "POST",
      body: JSON.stringify({ extraMins }),
    }),

  reallocateTask: (id: string, taskType: string) =>
    apiFetch(`/tasks/${id}/reallocate`, {
      method: "POST",
      body: JSON.stringify({ taskType }),
    }),

  notifyArrival: (payload: {
    name: string;
    reason: string;
    workingDayId: string;
    notes?: string;
  }) =>
    apiFetch("/patients/arrive", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTodayArrivals: () => apiFetch("/patients/today"),

  acknowledgeArrival: (id: string) =>
    apiFetch(`/patients/${id}/acknowledge`, { method: "PATCH" }),

  getActiveSessions: () => apiFetch("/auth/sessions"),

  adminLogoutUser: (userId: string) =>
    apiFetch(`/auth/sessions/${userId}`, { method: "DELETE" }),

  addColleague: (payload: { name: string; type: "OC" | "SENIOR_OC" | "MANAGER"; isAssignable?: boolean }) =>
    apiFetch("/colleagues", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateColleague: (id: string, payload: { type?: "OC" | "SENIOR_OC" | "MANAGER"; isAssignable?: boolean }) =>
    apiFetch(`/colleagues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteColleague: (id: string) =>
    apiFetch(`/colleagues/${id}`, { method: "DELETE" }),

  toggleLunch: (colleagueOnDayId: string, onLunch: boolean, startTime?: string) =>
    apiFetch("/working-days/lunch", {
      method: "POST",
      body: JSON.stringify({ colleagueOnDayId, onLunch, startTime }),
    }),

  getWeeklyStats: (weekOf?: string) =>
    apiFetch(`/working-days/stats${weekOf ? `?weekOf=${weekOf}` : ""}`),
};
