import type { AppConfig, Task, TaskStatus } from "./types";
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function findById<T extends {
  id: number;
}>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

export function getNextId(tasks: Task[]): number {
  return tasks.length === 0 ? 1 : Math.max(...tasks.map(t => t.id)) + 1;
}

export function statusLabel(status: TaskStatus): string {
  return status === "selesai" ? "Selesai" : "Belum Selesai";
}

export function isOverdue(task: Task): boolean {
  if (task.status === "selesai" || !task.deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.deadline < today;
}

export function formatDate(iso: string): string {
  if (!iso) return "Tanpa tenggat";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const config: AppConfig = {
  name: import.meta.env.VITE_APP_NAME ?? "Daftar Tugas Kuliah",
  version: import.meta.env.VITE_APP_VERSION ?? "0.0.0",
  author: import.meta.env.VITE_APP_AUTHOR ?? ""
};