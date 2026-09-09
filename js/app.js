/**
 * CloudTasks — Etapa 2
 * Aplicación de gestión de tareas conectada a Supabase (PostgreSQL).
 *
 * Estructura de una tarea (columnas de la tabla `tasks` en Supabase):
 * {
 *   id: string (uuid),   // Identificador único, generado por la base de datos
 *   title: string,       // Título de la tarea
 *   description: string, // Descripción
 *   completed: boolean,  // Estado de la tarea
 *   created_at: string,  // Fecha de creación (generada por la base de datos)
 *   deadline: string|null, // Fecha límite (YYYY-MM-DD)
 *   priority: "low" | "medium" | "high" // Prioridad
 * }
 *
 * El acceso a datos sigue aislado en el objeto TaskStore, tal como en la
 * Etapa 1 (que usaba localStorage). Ahora sus 4 funciones hablan con
 * Supabase mediante `supabaseClient` (definido en js/supabaseClient.js),
 * pero el resto de la aplicación (formulario, renderizado, filtros) no
 * tuvo que cambiar en su lógica, solo pasar a trabajar con async/await.
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Capa de acceso a datos (Etapa 2: Supabase / PostgreSQL)
   * ------------------------------------------------------------------ */
  const TaskStore = {
    async getAll() {
      const { data, error } = await supabaseClient
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error obteniendo tareas de Supabase:", error);
        throw error;
      }
      return data;
    },

    async create(task) {
      const { data, error } = await supabaseClient
        .from("tasks")
        .insert(task)
        .select()
        .single();

      if (error) {
        console.error("Error creando tarea en Supabase:", error);
        throw error;
      }
      return data;
    },

    async update(id, changes) {
      const { data, error } = await supabaseClient
        .from("tasks")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error actualizando tarea en Supabase:", error);
        throw error;
      }
      return data;
    },

    async remove(id) {
      const { error } = await supabaseClient.from("tasks").delete().eq("id", id);

      if (error) {
        console.error("Error eliminando tarea en Supabase:", error);
        throw error;
      }
    },
  };

  /* ------------------------------------------------------------------
   * Utilidades
   * ------------------------------------------------------------------ */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(isoDate) {
    if (!isoDate) return null;
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function isOverdue(task) {
    if (!task.deadline || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(task.deadline + "T00:00:00");
    return deadline < today;
  }

  function filterTasks(tasks, filter) {
    if (filter === "pending") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }

  const PRIORITY_LABELS = { low: "Baja", medium: "Media", high: "Alta" };

  /* ------------------------------------------------------------------
   * Referencias al DOM
   * ------------------------------------------------------------------ */
  const form = document.getElementById("task-form");
  const idInput = document.getElementById("task-id");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const deadlineInput = document.getElementById("deadline");
  const priorityInput = document.getElementById("priority");
  const titleError = document.getElementById("title-error");
  const deadlineError = document.getElementById("deadline-error");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const taskList = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const taskSummary = document.getElementById("task-summary");
  const connectionError = document.getElementById("connection-error");
  const filterButtons = document.querySelectorAll(".filter-btn");

  let currentFilter = "all";
  let cachedTasks = []; // usado para "Editar" sin volver a consultar Supabase

  /* ------------------------------------------------------------------
   * Validación
   * ------------------------------------------------------------------ */
  function validateForm() {
    let isValid = true;
    titleError.textContent = "";
    deadlineError.textContent = "";
    titleInput.classList.remove("is-invalid");
    deadlineInput.classList.remove("is-invalid");

    const title = titleInput.value.trim();
    if (!title) {
      titleError.textContent = "El título es obligatorio.";
      titleInput.classList.add("is-invalid");
      isValid = false;
    } else if (title.length > 80) {
      titleError.textContent = "El título no puede superar 80 caracteres.";
      titleInput.classList.add("is-invalid");
      isValid = false;
    }

    const deadline = deadlineInput.value;
    if (deadline) {
      const parsed = new Date(deadline + "T00:00:00");
      if (Number.isNaN(parsed.getTime())) {
        deadlineError.textContent = "La fecha límite no es válida.";
        deadlineInput.classList.add("is-invalid");
        isValid = false;
      }
    }

    return isValid;
  }

  /* ------------------------------------------------------------------
   * Renderizado
   * ------------------------------------------------------------------ */
  function renderSummary(allTasks) {
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.completed).length;
    taskSummary.textContent = total === 0 ? "" : `${completed} de ${total} tarea(s) completadas.`;
  }

  function renderTaskItems(tasks, allTasksCount) {
    taskList.innerHTML = "";

    if (allTasksCount === 0) {
      emptyState.hidden = false;
      emptyState.textContent = "No hay tareas registradas todavía. ¡Agrega la primera!";
      return;
    }

    if (tasks.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent = "No hay tareas que coincidan con este filtro.";
      return;
    }

    emptyState.hidden = true;

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.completed ? " is-completed" : "");
      li.dataset.priority = task.priority || "medium";
      li.dataset.id = task.id;

      const overdue = isOverdue(task);
      const statusBadge = task.completed
        ? '<span class="badge badge--status-completed">Completada</span>'
        : '<span class="badge badge--status-pending">Pendiente</span>';
      const priorityBadge = `<span class="badge badge--priority-${task.priority}">Prioridad ${PRIORITY_LABELS[task.priority] || "Media"}</span>`;
      const deadlineBadge = task.deadline
        ? `<span class="badge${overdue ? " badge--overdue" : ""}">${overdue ? "Vencida: " : "Vence: "}${formatDate(task.deadline)}</span>`
        : "";

      li.innerHTML = `
        <input type="checkbox" class="task-item__checkbox" ${task.completed ? "checked" : ""} aria-label="Marcar tarea como completada" />
        <div class="task-item__body">
          <p class="task-item__title">${escapeHtml(task.title)}</p>
          ${task.description ? `<p class="task-item__description">${escapeHtml(task.description)}</p>` : ""}
          <div class="task-item__meta">
            ${statusBadge}
            ${priorityBadge}
            ${deadlineBadge}
          </div>
        </div>
        <div class="task-item__actions">
          <button type="button" class="icon-btn" data-action="edit">Editar</button>
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete">Eliminar</button>
        </div>
      `;

      taskList.appendChild(li);
    });
  }

  async function renderTasks() {
    try {
      cachedTasks = await TaskStore.getAll();
      connectionError.hidden = true;
    } catch (err) {
      connectionError.hidden = false;
      cachedTasks = [];
    }

    renderSummary(cachedTasks);
    const visibleTasks = filterTasks(cachedTasks, currentFilter);
    renderTaskItems(visibleTasks, cachedTasks.length);
  }

  /* ------------------------------------------------------------------
   * Manejo del formulario (crear / editar)
   * ------------------------------------------------------------------ */
  function resetForm() {
    form.reset();
    idInput.value = "";
    priorityInput.value = "medium";
    submitBtn.disabled = false;
    submitBtn.textContent = "Agregar tarea";
    cancelEditBtn.hidden = true;
    titleError.textContent = "";
    deadlineError.textContent = "";
    titleInput.classList.remove("is-invalid");
    deadlineInput.classList.remove("is-invalid");
  }

  function startEdit(task) {
    idInput.value = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description || "";
    deadlineInput.value = task.deadline || "";
    priorityInput.value = task.priority || "medium";
    submitBtn.textContent = "Guardar cambios";
    cancelEditBtn.hidden = false;
    titleInput.focus();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!validateForm()) return;

    const editingId = idInput.value;
    const payload = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      deadline: deadlineInput.value || null,
      priority: priorityInput.value,
    };

    submitBtn.disabled = true;
    try {
      if (editingId) {
        await TaskStore.update(editingId, payload);
      } else {
        await TaskStore.create({ ...payload, completed: false });
      }
      resetForm();
      await renderTasks();
    } catch (err) {
      submitBtn.disabled = false;
      alert("No se pudo guardar la tarea en la base de datos. Revisa la consola para más detalles.");
    }
  });

  cancelEditBtn.addEventListener("click", resetForm);

  /* ------------------------------------------------------------------
   * Acciones sobre cada tarea (completar / editar / eliminar)
   * ------------------------------------------------------------------ */
  taskList.addEventListener("click", async function (event) {
    const item = event.target.closest(".task-item");
    if (!item) return;
    const id = item.dataset.id;

    if (event.target.matches(".task-item__checkbox")) {
      const checked = event.target.checked;
      try {
        await TaskStore.update(id, { completed: checked });
        await renderTasks();
      } catch (err) {
        event.target.checked = !checked; // revertir si falló
        alert("No se pudo actualizar el estado de la tarea.");
      }
      return;
    }

    const action = event.target.dataset.action;
    if (action === "delete") {
      const confirmed = window.confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.");
      if (confirmed) {
        try {
          await TaskStore.remove(id);
          await renderTasks();
        } catch (err) {
          alert("No se pudo eliminar la tarea.");
        }
      }
      return;
    }

    if (action === "edit") {
      const task = cachedTasks.find((t) => t.id === id);
      if (task) startEdit(task);
    }
  });

  /* ------------------------------------------------------------------
   * Filtros
   * ------------------------------------------------------------------ */
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", async function () {
      filterButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFilter = btn.dataset.filter;
      await renderTasks();
    });
  });

  /* ------------------------------------------------------------------
   * Inicialización
   * ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", renderTasks);
  if (document.readyState !== "loading") {
    renderTasks();
  }
})();