/* CloudTasks: calendario de tareas (vista mes / semana).

   No toca Supabase ni el repositorio: solo agrupa las tareas que ya tiene
   app.js por fecha limite y dibuja la cuadricula. Cuando se elige un dia,
   avisa a traves del callback que se le pase a init().
*/

const CloudTasksCalendar = (() => {
	const LOCALE = "es-CO";
	const MS_POR_DIA = 86400000;

	let cursor = startOfToday();
	let selected = startOfToday();
	let mode = "month";
	let tasksByDate = {};
	let onSelect = null;

	const els = {};

	function startOfToday() {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), now.getDate());
	}

	function toISO(date) {
		return [
			date.getFullYear(),
			String(date.getMonth() + 1).padStart(2, "0"),
			String(date.getDate()).padStart(2, "0"),
		].join("-");
	}

	function addDays(date, days) {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
	}

	function addMonths(date, months) {
		return new Date(date.getFullYear(), date.getMonth() + months, 1);
	}

	function isSameDay(a, b) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	/* Lunes de la semana que contiene a la fecha. */
	function startOfWeek(date) {
		const diaSemana = (date.getDay() + 6) % 7; // 0 = lunes
		return addDays(date, -diaSemana);
	}

	function buildMonthGrid(base) {
		const primerDiaMes = new Date(base.getFullYear(), base.getMonth(), 1);
		const primeraCelda = startOfWeek(primerDiaMes);
		const diasEnMes = new Date(
			base.getFullYear(),
			base.getMonth() + 1,
			0,
		).getDate();
		const offset = Math.round((primerDiaMes - primeraCelda) / MS_POR_DIA);
		const semanas = Math.ceil((offset + diasEnMes) / 7);
		return Array.from({ length: semanas * 7 }, (_, index) =>
			addDays(primeraCelda, index),
		);
	}

	function buildWeekGrid(base) {
		const primeraCelda = startOfWeek(base);
		return Array.from({ length: 7 }, (_, index) => addDays(primeraCelda, index));
	}

	function formatMonthYear(date) {
		return date.toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
	}

	function formatDayMonth(date) {
		return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
	}

	function formatWeekday(date) {
		return date.toLocaleDateString(LOCALE, { weekday: "short" }).replace(".", "");
	}

	function formatLongDate(date) {
		return date.toLocaleDateString(LOCALE, {
			weekday: "long",
			day: "numeric",
			month: "long",
		});
	}

	function renderTitle(days) {
		if (mode === "month") {
			els.title.textContent = formatMonthYear(cursor);
			return;
		}
		els.title.textContent = `${formatDayMonth(days[0])} \u2013 ${formatDayMonth(days.at(-1))}`;
	}

	function renderWeekdayRow() {
		const fila = document.createElement("div");
		fila.className = "calendar__weekdays";
		const lunes = startOfWeek(startOfToday());
		for (let i = 0; i < 7; i += 1) {
			const celda = document.createElement("span");
			celda.className = "calendar__weekday";
			celda.textContent = formatWeekday(addDays(lunes, i));
			fila.appendChild(celda);
		}
		return fila;
	}

	function renderDots(tasks) {
		const contenedor = document.createElement("span");
		contenedor.className = "day__dots";
		tasks.slice(0, 3).forEach((task) => {
			const punto = document.createElement("span");
			punto.className = task.completed
				? "dot dot--done"
				: `dot dot--${task.priority}`;
			contenedor.appendChild(punto);
		});
		return contenedor;
	}

	function renderMiniList(tasks) {
		const lista = document.createElement("ul");
		lista.className = "day__mini";
		tasks.slice(0, 3).forEach((task) => {
			const item = document.createElement("li");
			item.className = `is-${task.priority}${task.completed ? " is-done" : ""}`;
			item.textContent = task.title;
			lista.appendChild(item);
		});
		return lista;
	}

	function renderDay(date) {
		const iso = toISO(date);
		const tasks = tasksByDate[iso] || [];
		const esDeOtroMes = mode === "month" && date.getMonth() !== cursor.getMonth();

		const celda = document.createElement("button");
		celda.type = "button";
		celda.dataset.date = iso;
		celda.className = [
			"day",
			esDeOtroMes && "day--outside",
			isSameDay(date, startOfToday()) && "day--today",
			isSameDay(date, selected) && "day--selected",
		]
			.filter(Boolean)
			.join(" ");
		celda.setAttribute("aria-pressed", String(isSameDay(date, selected)));
		celda.setAttribute(
			"aria-label",
			`${formatLongDate(date)}: ${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`,
		);

		if (mode === "week") {
			const diaSemana = document.createElement("span");
			diaSemana.className = "day__weekday";
			diaSemana.textContent = formatWeekday(date);
			celda.appendChild(diaSemana);
		}

		const numero = document.createElement("span");
		numero.className = "day__num";
		numero.textContent = date.getDate();
		celda.appendChild(numero);

		if (mode === "week") {
			celda.appendChild(renderMiniList(tasks));
			if (tasks.length > 3) {
				const mas = document.createElement("span");
				mas.className = "day__more";
				mas.textContent = `+${tasks.length - 3} más`;
				celda.appendChild(mas);
			}
		} else if (tasks.length) {
			celda.appendChild(renderDots(tasks));
			if (tasks.length > 3) {
				const mas = document.createElement("span");
				mas.className = "day__more";
				mas.textContent = `+${tasks.length - 3}`;
				celda.appendChild(mas);
			}
		}

		return celda;
	}

	function render() {
		const dias = mode === "month" ? buildMonthGrid(cursor) : buildWeekGrid(cursor);
		renderTitle(dias);

		els.calendar.classList.toggle("calendar--month", mode === "month");
		els.calendar.classList.toggle("calendar--week", mode === "week");

		const grilla = document.createElement("div");
		grilla.className = "calendar__grid";
		dias.forEach((dia) => grilla.appendChild(renderDay(dia)));

		const hijos = mode === "month" ? [renderWeekdayRow(), grilla] : [grilla];
		els.calendar.replaceChildren(...hijos);
	}

	function select(date) {
		selected = date;
		cursor = new Date(date);
		render();
		if (typeof onSelect === "function") onSelect(toISO(selected));
	}

	function shift(paso) {
		cursor = mode === "month" ? addMonths(cursor, paso) : addDays(cursor, paso * 7);
		render();
	}

	function setMode(nuevoModo, botones) {
		mode = nuevoModo === "week" ? "week" : "month";
		botones.forEach((boton) => {
			const activo = boton.dataset.mode === mode;
			boton.classList.toggle("is-active", activo);
			boton.setAttribute("aria-pressed", String(activo));
		});
		render();
	}

	/** Agrupa las tareas por fecha limite y vuelve a dibujar la cuadricula. */
	function setTasks(tasks) {
		tasksByDate = {};
		tasks
			.filter((task) => task.deadline)
			.forEach((task) => {
				(tasksByDate[task.deadline] ??= []).push(task);
			});
		render();
	}

	function getSelectedISO() {
		return toISO(selected);
	}

	function getTasksOn(iso) {
		return tasksByDate[iso] || [];
	}

	function goToday() {
		select(startOfToday());
	}

	/** Conecta los botones del HTML (prev/next/hoy/segmentado) y dibuja. */
	function init(onSelectCallback) {
		els.calendar = document.getElementById("calendar");
		els.title = document.getElementById("calendar-title");
		if (!els.calendar || !els.title) return;

		onSelect = onSelectCallback || null;

		const botonesModo = [...document.querySelectorAll(".segmented__btn")];
		document.getElementById("cal-prev")?.addEventListener("click", () => shift(-1));
		document.getElementById("cal-next")?.addEventListener("click", () => shift(1));
		document.getElementById("cal-today")?.addEventListener("click", goToday);
		botonesModo.forEach((boton) => {
			boton.addEventListener("click", () => setMode(boton.dataset.mode, botonesModo));
		});

				els.calendar.addEventListener("click", (event) => {
			const celda = event.target.closest("[data-date]");
			if (!celda) return;
			const [year, month, day] = celda.dataset.date.split("-").map(Number);
			select(new Date(year, month - 1, day));
			const prefiereMenosMovimiento = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			document.getElementById("day-title")?.scrollIntoView({
				behavior: prefiereMenosMovimiento ? "auto" : "smooth",
				block: "start",
			});
		});

		render();
	}
	return { init, setTasks, getSelectedISO, getTasksOn, goToday };
})();
