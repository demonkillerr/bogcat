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

export function clearAuth() {
  localStorage.removeItem("bogcat_token");
  localStorage.removeItem("bogcat_role");
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
    dob: string;
    reason: string;
    workingDayId: string;
  }) =>
    apiFetch("/patients/arrive", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTodayArrivals: () => apiFetch("/patients/today"),

  acknowledgeArrival: (id: string) =>
    apiFetch(`/patients/${id}/acknowledge`, { method: "PATCH" }),
};
