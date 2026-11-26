import "./style.css";
import type { Task, TaskInput, TaskStatus, Priority, StatusFilter } from "./types";
import {
  config,
  escapeHtml,
  findById,
  formatDate,
  getNextId,
  isOverdue,
  loadFromStorage,
  saveToStorage,
  statusLabel,
} from "./utils";

const STORAGE_KEY = "tugas-kuliah:v1";

const seedTasks: Task[] = [
  {
    id: 1,
    title: "Membuat repository GitHub",
    course: "Pengembangan Aplikasi Web",
    description: "Inisialisasi repo lokal, buat file .gitignore, dan push ke GitHub.",
    deadline: "",
    priority: "sedang",
    status: "selesai",
  },
  {
    id: 2,
    title: "Latihan merge conflict",
    course: "Pengembangan Aplikasi Web",
    description: "Buat dua branch terpisah, ubah baris yang sama, lalu selesaikan konflik saat merge.",
    deadline: "",
    priority: "tinggi",
    status: "belum",
  },
];

// ===== Koleksi Ikon SVG Crisp =====
const icons = {
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  book: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  save: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  layers: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  checkCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

// ===== State =====
let tasks: Task[] = loadFromStorage<Task[]>(STORAGE_KEY, seedTasks);
let filter: StatusFilter = "semua";
let editingId: number | null = null;
let isEditing: boolean = false;
let activeModalTaskId: number | null = null;

// ===== Elemen DOM =====
const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return el;
};

const form = $<HTMLFormElement>("#task-form");
const titleInput = $<HTMLInputElement>("#title");
const courseInput = $<HTMLInputElement>("#course");
const descriptionInput = $<HTMLTextAreaElement>("#description");
const deadlineInput = $<HTMLInputElement>("#deadline");
const priorityInput = $<HTMLSelectElement>("#priority");
const statusInput = $<HTMLSelectElement>("#status");
const statusField = $<HTMLDivElement>("#status-field");
const submitBtn = $<HTMLButtonElement>("#submit-btn");
const cancelBtn = $<HTMLButtonElement>("#cancel-btn");
const formTitle = $<HTMLHeadingElement>("#form-title");
const listEl = $<HTMLUListElement>("#task-list");
const emptyEl = $<HTMLDivElement>("#empty");
const statsEl = $<HTMLElement>("#stats");

// Elemen Modal
const modal = $<HTMLDialogElement>("#task-modal");
const modalPriority = $<HTMLSpanElement>("#modal-priority");
const modalStatus = $<HTMLSpanElement>("#modal-status");
const modalTitle = $<HTMLHeadingElement>("#modal-title");
const modalCourse = $<HTMLSpanElement>("#modal-course");
const modalDeadline = $<HTMLSpanElement>("#modal-deadline");
const modalDesc = $<HTMLDivElement>("#modal-desc");
const modalDoneBtn = $<HTMLButtonElement>("#modal-done-btn");
const modalCloseBtn = $<HTMLButtonElement>("#modal-close-btn");

// ===== Persistensi =====
function persist(): void {
  saveToStorage<Task[]>(STORAGE_KEY, tasks);
}

// ===== CRUD =====
function addTask(input: TaskInput): void {
  tasks = [...tasks, { id: getNextId(tasks), ...input }];
}

function updateTask(id: number, input: TaskInput): void {
  tasks = tasks.map((t) => (t.id === id ? { ...t, ...input } : t));
}

function deleteTask(id: number): void {
  tasks = tasks.filter((t) => t.id !== id);
}

function toggleStatus(id: number): void {
  const task = findById(tasks, id);
  if (!task) return;
  const next: TaskStatus = task.status === "selesai" ? "belum" : "selesai";
  updateTask(id, { ...task, status: next });
}

// ===== Render =====
function render(): void {
  const visible = tasks
    .filter((t) => filter === "semua" || t.status === filter)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "belum" ? -1 : 1;
      return (a.deadline || "9999").localeCompare(b.deadline || "9999");
    });

  listEl.innerHTML = visible
    .map((t) => {
      const done = t.status === "selesai";
      const late = isOverdue(t);
      return `
      <li class="task ${done ? "done" : ""}" data-id="${t.id}">
        <button class="check" data-action="toggle" aria-label="${done ? "Tandai belum selesai" : "Tandai selesai"}" aria-pressed="${done}">
          ${icons.check}
        </button>
        <div class="task-body">
          <p class="task-title">${escapeHtml(t.title)}</p>
          <div class="task-meta">
            <span class="meta-item">${icons.book} ${escapeHtml(t.course)}</span>
            <span>&bull;</span>
            <span class="meta-item meta-date ${late ? "late" : ""}">
              ${icons.calendar} ${formatDate(t.deadline)}${late ? " (Terlewat)" : ""}
            </span>
          </div>
          <div class="tags">
            <span class="tag p-${t.priority}">
              <span class="tag-dot"></span> Prioritas ${t.priority}
            </span>
            <span class="tag s-${t.status}">
              ${statusLabel(t.status)}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" data-action="edit" title="Edit tugas" aria-label="Edit tugas">
            ${icons.edit}
          </button>
          <button class="btn-icon danger" data-action="delete" title="Hapus tugas" aria-label="Hapus tugas">
            ${icons.trash}
          </button>
        </div>
      </li>`;
    })
    .join("");

  emptyEl.hidden = visible.length > 0;

  const total = tasks.length;
  const selesai = tasks.filter((t) => t.status === "selesai").length;
  const belum = total - selesai;

  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">${icons.layers} Total Tugas</span>
      <strong>${total}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-label">${icons.clock} Belum Selesai</span>
      <strong>${belum}</strong>
    </div>
    <div class="stat-card accent">
      <span class="stat-label">${icons.checkCircle} Selesai</span>
      <strong>${selesai}</strong>
    </div>`;

  document.querySelectorAll<HTMLButtonElement>(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
}

// ===== Modal Pop-up =====
function openModal(id: number): void {
  const task = findById(tasks, id);
  if (!task) return;
  activeModalTaskId = id;

  modalTitle.textContent = task.title;
  modalCourse.innerHTML = `${icons.book} ${escapeHtml(task.course)}`;
  modalDeadline.innerHTML = `${icons.calendar} ${formatDate(task.deadline)}${isOverdue(task) ? " (Terlewat)" : ""}`;
  modalDesc.textContent = task.description || "Tidak ada deskripsi tambahan untuk tugas ini.";

  modalPriority.className = `tag p-${task.priority}`;
  modalPriority.innerHTML = `<span class="tag-dot"></span> Prioritas ${task.priority}`;

  modalStatus.className = `tag s-${task.status}`;
  modalStatus.textContent = statusLabel(task.status);

  modalDoneBtn.textContent = task.status === "selesai" ? "Tandai Belum Selesai" : "Tandai Selesai";

  modal.showModal();
}

modalCloseBtn.addEventListener("click", () => {
  modal.close();
});

modalDoneBtn.addEventListener("click", () => {
  if (activeModalTaskId !== null) {
    toggleStatus(activeModalTaskId);
    persist();
    render();
    modal.close();
  }
});

modal.addEventListener("click", (e) => {
  const rect = modal.getBoundingClientRect();
  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;
  if (!isInDialog) {
    modal.close();
  }
});

// ===== Form =====
function startEdit(id: number): void {
  const task = findById(tasks, id);
  if (!task) return;
  editingId = id;
  isEditing = true;
  titleInput.value = task.title;
  courseInput.value = task.course;
  descriptionInput.value = task.description || "";
  deadlineInput.value = task.deadline;
  priorityInput.value = task.priority;
  statusInput.value = task.status;
  setFormMode();
  titleInput.focus();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function resetForm(): void {
  editingId = null;
  isEditing = false;
  form.reset();
  priorityInput.value = "sedang";
  descriptionInput.value = "";
  setFormMode();
}

function setFormMode(): void {
  formTitle.textContent = isEditing ? "Edit Tugas" : "Tambah Tugas Baru";
  submitBtn.innerHTML = isEditing
    ? `${icons.save} <span>Simpan Perubahan</span>`
    : `${icons.plus} <span>Tambah Tugas</span>`;
  cancelBtn.hidden = !isEditing;
  statusField.hidden = !isEditing;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const input: TaskInput = {
    title: titleInput.value.trim(),
    course: courseInput.value.trim(),
    description: descriptionInput.value.trim(),
    deadline: deadlineInput.value,
    priority: priorityInput.value as Priority,
    status: isEditing ? (statusInput.value as TaskStatus) : "belum",
  };
  if (!input.title || !input.course) return;

  if (editingId !== null) updateTask(editingId, input);
  else addTask(input);

  persist();
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

// ===== Event delegation untuk daftar =====
listEl.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("button[data-action]");

  if (button) {
    const li = button.closest<HTMLLIElement>("li[data-id]");
    if (!li) return;
    const id = Number(li.dataset.id);

    switch (button.dataset.action) {
      case "toggle":
        toggleStatus(id);
        break;
      case "edit":
        startEdit(id);
        return;
      case "delete": {
        const task = findById(tasks, id);
        if (task && window.confirm(`Hapus tugas "${task.title}"?`)) {
          deleteTask(id);
          if (editingId === id) resetForm();
        } else {
          return;
        }
        break;
      }
    }
    persist();
    render();
    return;
  }

  const taskCard = target.closest<HTMLLIElement>("li.task");
  if (taskCard) {
    const id = Number(taskCard.dataset.id);
    openModal(id);
  }
});

document.querySelectorAll<HTMLButtonElement>(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filter = chip.dataset.filter as StatusFilter;
    render();
  });
});


document.title = config.name;
$("#app-title").textContent = config.name;
$("#app-meta").textContent = config.author ? `Oleh ${config.author} · Versi ${config.version}` : `Versi ${config.version}`;
$("#app-footer").textContent = `${config.name} v${config.version}`;

setFormMode();
render();