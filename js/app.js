/* CloudTasks: logica principal de la aplicacion. */

(() => {
	const PRIORITIES = {
		low: { label: "Prioridad baja", level: 1 },
		medium: { label: "Prioridad media", level: 2 },
		high: { label: "Prioridad alta", level: 3 },
	};

	const state = { tasks: [], filter: "all" };
	const dom = {
		form: document.getElementById("formulario-tarea"),
		title: document.getElementById("title"),
		description: document.getElementById("description"),
		deadline: document.getElementById("deadline"),
		priority: document.getElementById("priority"),
		taskList: document.getElementById("task-list"),
		emptyState: document.getElementById("empty-state"),
		summary: document.getElementById("task-summary"),
		connectionError: document.getElementById("connection-error"),
		filters: [...document.querySelectorAll(".filter-btn")],
	};

	const repository = {
		async list() {
			const { data, error } = await window.supabaseClient
				.from("tasks")
				.select("*")
				.order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		},
		async create(task) {
			const { data, error } = await window.supabaseClient
				.from("tasks")
				.insert(task)
				.select()
				.single();
			if (error) throw error;
			return data;
		},
		async update(id, changes) {
			const { error } = await window.supabaseClient
				.from("tasks")
				.update(changes)
				.eq("id", id);
			if (error) throw error;
		},
		async remove(id) {
			const { error } = await window.supabaseClient
				.from("tasks")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
	};

	const createId = () =>
		window.crypto?.randomUUID?.() ??
		`tarea_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
	const parseLocalDate = (isoDate) => {
		const [year, month, day] = String(isoDate).split("-").map(Number);
		return new Date(year, month - 1, day);
	};
	const today = () => {
		const date = new Date();
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	};
	const daysUntil = (isoDate) =>
		Math.round((parseLocalDate(isoDate) - today()) / 86400000);
	const readableDate = (isoDate) =>
		parseLocalDate(isoDate).toLocaleDateString("es-CO", {
			day: "numeric",
			month: "short",
		});

	function describeDeadline(task) {
		if (task.completed) return { text: "Completada", className: "chip--done" };
		const days = daysUntil(task.deadline);
		if (days < 0) {
			const overdueDays = Math.abs(days);
			return {
				text: `Vencida hace ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}`,
				className: "chip--overdue",
			};
		}
		if (days === 0) return { text: "Vence hoy", className: "chip--today" };
		if (days === 1) return { text: "Vence mañana", className: "chip--today" };
		return {
			text: `Vence en ${days} dias, ${readableDate(task.deadline)}`,
			className: "",
		};
	}

	function validate(data) {
		const errors = {};
		if (!data.title) errors.title = "Escribe un titulo para la tarea.";
		else if (data.title.length < 3)
			errors.title = "El titulo necesita al menos 3 caracteres.";
		else if (data.title.length > 80)
			errors.title = "El titulo admite maximo 80 caracteres.";
		if (!data.deadline) errors.deadline = "Elige una fecha limite.";
		else if (Number.isNaN(parseLocalDate(data.deadline).getTime())) {
			errors.deadline = "La fecha no tiene un formato valido.";
		} else if (parseLocalDate(data.deadline) < today()) {
			errors.deadline = "La fecha limite no puede estar en el pasado.";
		}
		if (!PRIORITIES[data.priority])
			errors.priority = "Selecciona una prioridad.";
		return errors;
	}

	function renderErrors(errors) {
		["title", "deadline", "priority"].forEach((field) => {
			const input = document.getElementById(field);
			const errorElement = document.getElementById(`${field}-error`);
			const message = errors[field] ?? "";
			input?.classList.toggle("is-invalid", Boolean(message));
			input?.setAttribute("aria-invalid", message ? "true" : "false");
			if (errorElement) errorElement.textContent = message;
		});
	}

	function createPriorityBars(priority) {
		const container = document.createElement("span");
		container.className = `priority priority--${priority}`;
		container.title = PRIORITIES[priority].label;
		for (let index = 1; index <= 3; index += 1) {
			const bar = document.createElement("span");
			if (index <= PRIORITIES[priority].level) bar.className = "is-on";
			container.appendChild(bar);
		}
		const accessibleLabel = document.createElement("span");
		accessibleLabel.className = "visually-hidden";
		accessibleLabel.textContent = PRIORITIES[priority].label;
		container.appendChild(accessibleLabel);
		return container;
	}

	function createTaskElement(task) {
		const item = document.createElement("li");
		item.className = `task task--${task.priority}${task.completed ? " is-completed" : ""}`;
		item.dataset.id = task.id;
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "task__check";
		checkbox.checked = Boolean(task.completed);
		checkbox.dataset.action = "toggle";
		checkbox.setAttribute(
			"aria-label",
			`Marcar "${task.title}" como completada`,
		);
		const body = document.createElement("div");
		body.className = "task__body";
		const title = document.createElement("h3");
		title.className = "task__title";
		title.textContent = task.title;
		const description = document.createElement("p");
		description.className = "task__description";
		description.textContent = task.description;
		const metadata = document.createElement("div");
		metadata.className = "task__meta";
		const deadline = describeDeadline(task);
		const chip = document.createElement("span");
		chip.className = `chip ${deadline.className}`;
		chip.textContent = deadline.text;
		metadata.append(chip, createPriorityBars(task.priority));
		body.append(title, description, metadata);
		const deleteButton = document.createElement("button");
		deleteButton.type = "button";
		deleteButton.className = "task__delete";
		deleteButton.dataset.action = "delete";
		deleteButton.setAttribute("aria-label", `Eliminar "${task.title}"`);
		deleteButton.textContent = "Eliminar";
		item.append(checkbox, body, deleteButton);
		return item;
	}

	const sortTasks = (tasks) =>
		[...tasks].sort((a, b) => {
			if (a.completed !== b.completed) return a.completed ? 1 : -1;
			if (a.completed) return new Date(b.created_at) - new Date(a.created_at);
			return parseLocalDate(a.deadline) - parseLocalDate(b.deadline);
		});
	const visibleTasks = () =>
		state.tasks.filter((task) =>
			state.filter === "pending"
				? !task.completed
				: state.filter === "completed"
					? task.completed
					: true,
		);

	function renderSummary() {
		const pending = state.tasks.filter((task) => !task.completed).length;
		if (!state.tasks.length) {
			dom.summary.textContent = "Todavia no hay tareas registradas.";
			return;
		}
		const overdue = state.tasks.filter(
			(task) => !task.completed && daysUntil(task.deadline) < 0,
		).length;
		let message =
			pending === 0
				? "No queda nada pendiente."
				: `Tienes ${pending} ${pending === 1 ? "tarea pendiente" : "tareas pendientes"}.`;
		if (overdue)
			message += ` ${overdue} ${overdue === 1 ? "esta vencida." : "estan vencidas."}`;
		dom.summary.textContent = message;
	}

	function render() {
		const tasks = sortTasks(visibleTasks());
		dom.taskList.replaceChildren(...tasks.map(createTaskElement));
		dom.emptyState.hidden = tasks.length > 0;
		if (!tasks.length) {
			dom.emptyState.textContent =
				state.filter === "pending"
					? "No tienes tareas pendientes. Todo esta al dia."
					: state.filter === "completed"
						? "Todavia no has completado ninguna tarea."
						: "Aun no hay tareas. Crea la primera con el formulario.";
		}
		renderSummary();
	}

	async function handleSubmit(event) {
		event.preventDefault();
		const data = {
			title: dom.title.value.trim(),
			description: dom.description.value.trim(),
			deadline: dom.deadline.value,
			priority: dom.priority.value,
		};
		const errors = validate(data);
		renderErrors(errors);
		if (Object.keys(errors).length) {
			document.getElementById(Object.keys(errors)[0])?.focus();
			return;
		}
		const task = {
			id: createId(),
			...data,
			completed: false,
			created_at: new Date().toISOString(),
		};
		try {
			const createdTask = await repository.create(task);
			state.tasks.push(createdTask ?? task);
			dom.form.reset();
			render();
		} catch (error) {
			console.error("No se pudo crear la tarea:", error);
			dom.connectionError.hidden = false;
		}
	}

	async function handleTaskAction(event) {
		const actionElement = event.target.closest("[data-action]");
		if (!actionElement) return;
		const item = actionElement.closest(".task");
		const id = item?.dataset.id;
		if (!id) return;
		if (actionElement.dataset.action === "toggle") {
			const completed = actionElement.checked;
			try {
				await repository.update(id, { completed });
				state.tasks = state.tasks.map((task) =>
					task.id === id ? { ...task, completed } : task,
				);
				render();
			} catch (error) {
				console.error("No se pudo actualizar la tarea:", error);
				dom.connectionError.hidden = false;
			}
			return;
		}
		const task = state.tasks.find((candidate) => candidate.id === id);
		if (task && window.confirm(`Eliminar la tarea "${task.title}"`)) {
			try {
				await repository.remove(id);
				state.tasks = state.tasks.filter((candidate) => candidate.id !== id);
				render();
			} catch (error) {
				console.error("No se pudo eliminar la tarea:", error);
				dom.connectionError.hidden = false;
			}
		}
	}

	function handleFilter(event) {
		state.filter = event.currentTarget.dataset.filter;
		dom.filters.forEach((button) => {
			const isActive = button.dataset.filter === state.filter;
			button.classList.toggle("is-active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});
		render();
	}

	async function init() {
		dom.deadline.min = new Date().toISOString().slice(0, 10);
		dom.form.addEventListener("submit", handleSubmit);
		dom.taskList.addEventListener("change", handleTaskAction);
		dom.taskList.addEventListener("click", handleTaskAction);
		dom.filters.forEach((button) => {
			button.addEventListener("click", handleFilter);
		});
		try {
			state.tasks = await repository.list();
			render();
		} catch (error) {
			console.error("No se pudieron cargar las tareas:", error);
			dom.connectionError.hidden = false;
		}
	}

	document.addEventListener("DOMContentLoaded", init);
})();
