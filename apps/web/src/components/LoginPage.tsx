"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, setRole, setUserId, setSessionId, setUsername as storeUsername } from "@/lib/api";

const ROLE_ROUTES: Record<string, string> = {
  COORDINATOR: "/coordinator",
  FRONTDESK: "/frontdesk",
  ADMIN: "/admin",
  OPTOMETRIST: "/optometrist",
};

type AccountOption =
  | "coordinator"
  | "frontdesk"
  | "admin"
  | "optometrist_room1"
  | "optometrist_room2"
  | "optometrist_room3"
  | "optometrist_room4";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<AccountOption>("coordinator");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setToken(data.token);
      setRole(data.role);
      setUserId(data.userId);
      setSessionId(data.sessionId);
      storeUsername(username);
      router.push(ROLE_ROUTES[data.role] ?? "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-blue-700">BOGCAT</h1>
          <p className="mt-1 text-sm text-slate-500">Boots Opticians Gyle Coordinator&apos;s Assistive Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value as AccountOption)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coordinator">Coordinator</option>
              <option value="frontdesk">Front Desk</option>
              <option value="admin">Admin</option>
              <optgroup label="Optometrist">
                <option value="optometrist_room1">Optom — Room 1</option>
                <option value="optometrist_room2">Optom — Room 2</option>
                <option value="optometrist_room3">Optom — Room 3</option>
                <option value="optometrist_room4">Optom — Room 4</option>
              </optgroup>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 text-sm transition"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
