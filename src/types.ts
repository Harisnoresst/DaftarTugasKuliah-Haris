export type TaskStatus = "belum" | "selesai";
export type Priority = "rendah" | "sedang" | "tinggi";
export type StatusFilter = TaskStatus | "semua";

export interface Task {
  id: number;
  title: string;
  course: string;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  description?: string;
}

export type TaskInput = Omit<Task, "id">;
export interface AppConfig {
  name: string;
  version: string;
  author: string;
}