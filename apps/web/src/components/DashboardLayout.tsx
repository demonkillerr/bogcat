"use client";

import { useRouter } from "next/navigation";
import { api, clearAuth } from "@/lib/api";

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ title, children }: Props) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore — still clear local auth
    } finally {
      clearAuth();
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Topbar */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <span className="font-bold text-lg tracking-tight">BOGCAT</span>
          <span className="ml-3 text-blue-200 text-sm">{title}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg transition"
        >
          Log Out
        </button>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
