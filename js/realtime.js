/* CloudTasks: sincronizacion en tiempo real con Supabase Realtime.

   Escucha los cambios de la tabla "tasks" en PostgreSQL a traves de un canal
   WebSocket y avisa a la aplicacion cuando otro usuario u otra pestaña crea,
   actualiza o elimina una tarea.

   Requisito en Supabase:
     Database > Replication > habilitar "tasks" en la publicacion
     supabase_realtime. Equivalente por SQL:
     ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
*/

const CloudTasksRealtime = (() => {
	const TABLE = "tasks";
	const CHANNEL = "cloudtasks-tasks";
	const RETRY_BASE_MS = 2000;
	const RETRY_MAX_MS = 30000;

	const config = {};
	let channel = null;
	let retries = 0;
	let retryTimer = null;
	let firstConnection = true;
	let running = false;

	const notify = (name, payload) => {
		if (typeof config[name] === "function") config[name](payload);
	};

	function handleChange(payload) {
		if (payload.eventType === "INSERT") notify("onInsert", payload.new);
		else if (payload.eventType === "UPDATE") notify("onUpdate", payload.new);
		else if (payload.eventType === "DELETE") notify("onDelete", payload.old?.id);
	}

	function closeChannel() {
		if (!channel) return;
		config.client.removeChannel(channel);
		channel = null;
	}

	/* Reintento con espera creciente para no saturar el servicio. */
	function scheduleRetry() {
		if (retryTimer || !running) return;
		const delay = Math.min(RETRY_BASE_MS * 2 ** retries, RETRY_MAX_MS);
		retries += 1;
		retryTimer = window.setTimeout(() => {
			retryTimer = null;
			subscribe();
		}, delay);
	}

	function subscribe() {
		if (!running) return;
		closeChannel();
		notify("onStatus", "conectando");

		const current = config.client.channel(CHANNEL);
		channel = current;

		current
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: TABLE },
				handleChange,
			)
			.subscribe((status) => {
				// Un canal reemplazado todavia puede emitir estados: se ignoran.
				if (channel !== current) return;
				if (status === "SUBSCRIBED") {
					retries = 0;
					notify("onStatus", "conectado");
					// Tras una reconexion pueden haberse perdido eventos.
					if (!firstConnection) notify("onResync");
					firstConnection = false;
					return;
				}
				if (
					status === "CHANNEL_ERROR" ||
					status === "TIMED_OUT" ||
					status === "CLOSED"
				) {
					notify("onStatus", "sin-conexion");
					scheduleRetry();
				}
			});
	}

	/* Al volver a la pestaña se recarga por si el socket estuvo inactivo. */
	const handleVisibility = () => {
		if (document.visibilityState === "visible" && running) notify("onResync");
	};

	function start(options) {
		if (!options?.client) {
			console.warn("CloudTasksRealtime: falta el cliente de Supabase.");
			return;
		}
		Object.assign(config, options);
		running = true;
		retries = 0;
		firstConnection = true;
		subscribe();
		document.addEventListener("visibilitychange", handleVisibility);
		window.addEventListener("online", subscribe);
	}

	function stop() {
		running = false;
		window.clearTimeout(retryTimer);
		retryTimer = null;
		closeChannel();
		document.removeEventListener("visibilitychange", handleVisibility);
		window.removeEventListener("online", subscribe);
		notify("onStatus", "sin-conexion");
	}

	return { start, stop };
})();