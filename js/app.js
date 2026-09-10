/* ==========================================================================
CloudTasks, logica de la aplicacion (Etapa 1)

Organizacion del archivo:
    1. Configuracion y constantes
    2. Referencias del DOM
    3. Capa de datos (repositorio local, se reemplaza por Supabase en Etapa 2)
    4. Utilidades de fecha y texto
    5. Validacion del formulario
    6. Renderizado de la interfaz
    7. Manejadores de eventos
    8. Arranque

Decision de diseño: todas las funciones del repositorio son asincronas
aunque hoy trabajen contra localStorage. En la Etapa 2 solo se reemplaza
el objeto "repositorio" por llamadas a Supabase y el resto del archivo
permanece igual.
   ========================================================================== */

(function () {
    'use strict';

    /* 1. Configuracion y constantes -------------------------------------- */

    var CLAVE_ALMACENAMIENTO = 'cloudtasks.tasks.v1';

    // Los valores (low, medium, high) son los que viajaran a PostgreSQL.
    // Las etiquetas son solo para la interfaz.
    var PRIORIDADES = {
        low: { etiqueta: 'Prioridad baja', nivel: 1 },
        medium: { etiqueta: 'Prioridad media', nivel: 2 },
        high: { etiqueta: 'Prioridad alta', nivel: 3 }
    };

    var LIMITES = { titulo: 80, descripcion: 280 };

    // Estado en memoria de la aplicacion.
    var estado = {
        tareas: [],
        filtro: 'all'
    };

    /* 2. Referencias del DOM --------------------------------------------- */

    var dom = {
        formulario: document.getElementById('formulario-tarea'),
        titulo: document.getElementById('title'),
        descripcion: document.getElementById('description'),
        fechaLimite: document.getElementById('deadline'),
        prioridad: document.getElementById('priority'),
        estadoFormulario: document.getElementById('estado-formulario'),
        lista: document.getElementById('lista-tareas'),
        estadoVacio: document.getElementById('estado-vacio'),
        resumen: document.getElementById('resumen'),
        filtros: document.querySelectorAll('.filter'),
        contadores: document.querySelectorAll('.filter__count'),
        notaPersistencia: document.getElementById('nota-persistencia')
    };

    /* 3. Capa de datos ---------------------------------------------------- */

    // Si el navegador bloquea localStorage (modo privado, cookies restringidas)
    // la aplicacion sigue funcionando en memoria y se avisa al usuario.
    var hayAlmacenamiento = (function () {
        try {
            window.localStorage.setItem('__prueba__', '1');
            window.localStorage.removeItem('__prueba__');
            return true;
        } catch (error) {
            return false;
        }
    })();

    var memoria = [];

    function leerColeccion() {
        if (!hayAlmacenamiento) {
            return memoria.slice();
        }
        try {
            var crudo = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
            var datos = crudo ? JSON.parse(crudo) : [];
            return Array.isArray(datos) ? datos : [];
        } catch (error) {
            console.error('No se pudo leer el almacenamiento local:', error);
            return [];
        }
    }

    function escribirColeccion(coleccion) {
        memoria = coleccion.slice();
        if (!hayAlmacenamiento) {
            return;
        }
        try {
            window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(coleccion));
        } catch (error) {
            console.error('No se pudo guardar en el almacenamiento local:', error);
        }
    }

    // Contrato CRUD. En la Etapa 2 cada metodo llamara a Supabase
    // (select, insert, update, delete) manteniendo la misma firma.
    var repositorio = {
        listar: function () {
            return Promise.resolve(leerColeccion());
        },
        crear: function (tarea) {
            var coleccion = leerColeccion();
            coleccion.push(tarea);
            escribirColeccion(coleccion);
            return Promise.resolve(tarea);
        },
        actualizar: function (id, cambios) {
            var coleccion = leerColeccion().map(function (tarea) {
                return tarea.id === id ? Object.assign({}, tarea, cambios) : tarea;
            });
            escribirColeccion(coleccion);
            return Promise.resolve(true);
        },
        eliminar: function (id) {
            var coleccion = leerColeccion().filter(function (tarea) {
                return tarea.id !== id;
            });
            escribirColeccion(coleccion);
            return Promise.resolve(true);
        }
    };

    /* 4. Utilidades de fecha y texto -------------------------------------- */

    function generarId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'tarea_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
    }

    // Convierte "AAAA-MM-DD" en una fecha local, sin desfase por zona horaria.
    function aFechaLocal(iso) {
        var partes = String(iso).split('-');
        return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    }

    function hoySinHora() {
        var ahora = new Date();
        return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    }

    function diasHasta(iso) {
        var milisegundosPorDia = 86400000;
        return Math.round((aFechaLocal(iso) - hoySinHora()) / milisegundosPorDia);
    }

    function fechaLegible(iso) {
        return aFechaLocal(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }

    // Devuelve el texto del vencimiento y el modificador visual del chip.
    function describirVencimiento(tarea) {
        if (tarea.completed) {
            return { texto: 'Completada', clase: 'chip--done' };
        }
        var dias = diasHasta(tarea.deadline);
        if (dias < 0) {
            var atraso = Math.abs(dias);
            return { texto: 'Vencida hace ' + atraso + (atraso === 1 ? ' dia' : ' dias'), clase: 'chip--overdue' };
        }
        if (dias === 0) {
            return { texto: 'Vence hoy', clase: 'chip--today' };
        }
        if (dias === 1) {
            return { texto: 'Vence mañana', clase: 'chip--today' };
        }
        return { texto: 'Vence en ' + dias + ' dias, ' + fechaLegible(tarea.deadline), clase: '' };
    }

    /* 5. Validacion del formulario ---------------------------------------- */

    // Devuelve un objeto con un mensaje por cada campo invalido.
    // Si el objeto queda vacio, el formulario es valido.
    function validar(datos) {
        var errores = {};
        var hoy = hoySinHora();

        if (!datos.title) {
            errores.title = 'Escribe un titulo para la tarea.';
        } else if (datos.title.length < 3) {
            errores.title = 'El titulo necesita al menos 3 caracteres.';
        } else if (datos.title.length > LIMITES.titulo) {
            errores.title = 'El titulo admite maximo ' + LIMITES.titulo + ' caracteres.';
        }

        if (!datos.description) {
            errores.description = 'Describe brevemente que hay que hacer.';
        } else if (datos.description.length > LIMITES.descripcion) {
            errores.description = 'La descripcion admite maximo ' + LIMITES.descripcion + ' caracteres.';
        }

        if (!datos.deadline) {
            errores.deadline = 'Elige una fecha limite.';
        } else if (isNaN(aFechaLocal(datos.deadline).getTime())) {
            errores.deadline = 'La fecha no tiene un formato valido.';
        } else if (aFechaLocal(datos.deadline) < hoy) {
            errores.deadline = 'La fecha limite no puede estar en el pasado.';
        }

        if (!datos.priority) {
            errores.priority = 'Selecciona una prioridad.';
        } else if (!Object.prototype.hasOwnProperty.call(PRIORIDADES, datos.priority)) {
            errores.priority = 'La prioridad seleccionada no es valida.';
        }

        return errores;
    }

    function pintarErrores(errores) {
        ['title', 'description', 'deadline', 'priority'].forEach(function (campo) {
            var input = document.getElementById(campo);
            var contenedorError = document.getElementById('error-' + campo);
            var mensaje = errores[campo] || '';

            contenedorError.textContent = mensaje;
            input.classList.toggle('is-invalid', Boolean(mensaje));
            input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
        });
    }

    /* 6. Renderizado de la interfaz --------------------------------------- */

    // Orden: primero lo pendiente, dentro de eso lo que vence antes;
    // las completadas quedan al final, de la mas reciente a la mas antigua.
    function ordenar(tareas) {
        return tareas.slice().sort(function (a, b) {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.completed) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            return aFechaLocal(a.deadline) - aFechaLocal(b.deadline);
        });
    }

    function filtrar(tareas) {
        if (estado.filtro === 'pending') {
            return tareas.filter(function (tarea) { return !tarea.completed; });
        }
        if (estado.filtro === 'completed') {
            return tareas.filter(function (tarea) { return tarea.completed; });
        }
        return tareas;
    }

    function crearBarrasPrioridad(prioridad) {
        var contenedor = document.createElement('span');
        contenedor.className = 'priority priority--' + prioridad;
        contenedor.title = PRIORIDADES[prioridad].etiqueta;

        for (var i = 1; i <= 3; i += 1) {
            var barra = document.createElement('span');
            if (i <= PRIORIDADES[prioridad].nivel) {
                barra.className = 'is-on';
            }
            contenedor.appendChild(barra);
        }

        var texto = document.createElement('span');
        texto.className = 'visually-hidden';
        texto.textContent = PRIORIDADES[prioridad].etiqueta;
        contenedor.appendChild(texto);

        return contenedor;
    }

    // El contenido se inserta con textContent y no con innerHTML,
    // para que el texto del usuario nunca se interprete como HTML.
    function crearElementoTarea(tarea) {
        var item = document.createElement('li');
        item.className = 'task task--' + tarea.priority + (tarea.completed ? ' is-completed' : '');
        item.dataset.id = tarea.id;

        var check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'task__check';
        check.checked = Boolean(tarea.completed);
        check.dataset.accion = 'alternar';
        check.setAttribute('aria-label', 'Marcar "' + tarea.title + '" como completada');

        var cuerpo = document.createElement('div');
        cuerpo.className = 'task__body';

        var titulo = document.createElement('h3');
        titulo.className = 'task__title';
        titulo.textContent = tarea.title;

        var descripcion = document.createElement('p');
        descripcion.className = 'task__description';
        descripcion.textContent = tarea.description;

        var meta = document.createElement('div');
        meta.className = 'task__meta';

        var vencimiento = describirVencimiento(tarea);
        var chip = document.createElement('span');
        chip.className = 'chip ' + vencimiento.clase;
        chip.textContent = vencimiento.texto;

        meta.appendChild(chip);
        meta.appendChild(crearBarrasPrioridad(tarea.priority));

        cuerpo.appendChild(titulo);
        cuerpo.appendChild(descripcion);
        cuerpo.appendChild(meta);

        var borrar = document.createElement('button');
        borrar.type = 'button';
        borrar.className = 'task__delete';
        borrar.dataset.accion = 'eliminar';
        borrar.setAttribute('aria-label', 'Eliminar "' + tarea.title + '"');
        borrar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
            ' stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
            '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

        item.appendChild(check);
        item.appendChild(cuerpo);
        item.appendChild(borrar);

        return item;
    }

    function textoVacio() {
        if (estado.filtro === 'pending') {
            return 'No tienes tareas pendientes. Todo esta al dia.';
        }
        if (estado.filtro === 'completed') {
            return 'Todavia no has completado ninguna tarea.';
        }
        return 'Aun no hay tareas. Crea la primera con el formulario.';
    }

    function actualizarContadores() {
        var pendientes = estado.tareas.filter(function (t) { return !t.completed; }).length;
        var completadas = estado.tareas.length - pendientes;
        var conteos = { all: estado.tareas.length, pending: pendientes, completed: completadas };

        dom.contadores.forEach(function (nodo) {
            nodo.textContent = conteos[nodo.dataset.count];
        });

        actualizarResumen(pendientes);
    }

    function actualizarResumen(pendientes) {
        if (estado.tareas.length === 0) {
            dom.resumen.textContent = 'Todavia no hay tareas registradas.';
            return;
        }

        var vencidas = estado.tareas.filter(function (t) {
            return !t.completed && diasHasta(t.deadline) < 0;
        }).length;

        var frase = pendientes === 0
            ? 'No queda nada pendiente.'
            : 'Tienes ' + pendientes + (pendientes === 1 ? ' tarea pendiente.' : ' tareas pendientes.');

        if (vencidas > 0) {
            frase += ' ' + vencidas + (vencidas === 1 ? ' esta vencida.' : ' estan vencidas.');
        }

        dom.resumen.textContent = frase;
    }

    function renderizar(idResaltado) {
        var visibles = ordenar(filtrar(estado.tareas));

        dom.lista.innerHTML = '';

        visibles.forEach(function (tarea) {
            var elemento = crearElementoTarea(tarea);
            if (tarea.id === idResaltado) {
                elemento.classList.add('is-new');
            }
            dom.lista.appendChild(elemento);
        });

        dom.estadoVacio.textContent = textoVacio();
        dom.estadoVacio.hidden = visibles.length > 0;

        actualizarContadores();
    }

    function mostrarEstado(mensaje) {
        dom.estadoFormulario.textContent = mensaje;
        window.setTimeout(function () {
            dom.estadoFormulario.textContent = '';
        }, 4000);
    }

    /* 7. Manejadores de eventos ------------------------------------------- */

    function alEnviarFormulario(evento) {
        evento.preventDefault();

        var datos = {
            title: dom.titulo.value.trim(),
            description: dom.descripcion.value.trim(),
            deadline: dom.fechaLimite.value,
            priority: dom.prioridad.value
        };

        var errores = validar(datos);
        pintarErrores(errores);

        var camposConError = Object.keys(errores);
        if (camposConError.length > 0) {
            document.getElementById(camposConError[0]).focus();
            return;
        }

        // Estructura de la tarea segun la tabla "tasks" definida en la guia.
        var tarea = {
            id: generarId(),
            title: datos.title,
            description: datos.description,
            completed: false,
            created_at: new Date().toISOString(),
            deadline: datos.deadline,
            priority: datos.priority
        };

        repositorio.crear(tarea).then(function () {
            estado.tareas.push(tarea);
            dom.formulario.reset();
            dom.titulo.focus();
            renderizar(tarea.id);
            mostrarEstado('Tarea creada.');
        });
    }

    function alCambiarCheck(evento) {
        var check = evento.target.closest('[data-accion="alternar"]');
        if (!check) {
            return;
        }

        var id = check.closest('.task').dataset.id;
        var completada = check.checked;

        repositorio.actualizar(id, { completed: completada }).then(function () {
            estado.tareas = estado.tareas.map(function (tarea) {
                return tarea.id === id ? Object.assign({}, tarea, { completed: completada }) : tarea;
            });
            renderizar();
        });
    }

    function alClicEnLista(evento) {
        var boton = evento.target.closest('[data-accion="eliminar"]');
        if (!boton) {
            return;
        }

        var item = boton.closest('.task');
        var id = item.dataset.id;
        var tarea = estado.tareas.find(function (t) { return t.id === id; });

        if (!window.confirm('Eliminar la tarea "' + tarea.title + '"')) {
            return;
        }

        repositorio.eliminar(id).then(function () {
            estado.tareas = estado.tareas.filter(function (t) { return t.id !== id; });
            renderizar();
            mostrarEstado('Tarea eliminada.');
        });
    }

    function alCambiarFiltro(evento) {
        estado.filtro = evento.currentTarget.dataset.filter;

        dom.filtros.forEach(function (boton) {
            var activo = boton.dataset.filter === estado.filtro;
            boton.classList.toggle('is-active', activo);
            boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });

        renderizar();
    }

    /* 8. Arranque --------------------------------------------------------- */

    function iniciar() {
        // La fecha limite no puede ser anterior a hoy, tambien en el selector.
        dom.fechaLimite.min = new Date().toISOString().slice(0, 10);

        dom.formulario.addEventListener('submit', alEnviarFormulario);
        dom.lista.addEventListener('change', alCambiarCheck);
        dom.lista.addEventListener('click', alClicEnLista);
        dom.filtros.forEach(function (boton) {
            boton.addEventListener('click', alCambiarFiltro);
        });

        if (!hayAlmacenamiento) {
            dom.notaPersistencia.textContent = 'Este navegador no permite guardar datos localmente. ' +
                'Las tareas se perderan al recargar la pagina.';
            dom.notaPersistencia.parentElement.classList.add('is-warning');
        }

        repositorio.listar().then(function (tareas) {
            estado.tareas = tareas;
            renderizar();
        });
    }

    document.addEventListener('DOMContentLoaded', iniciar);
})();