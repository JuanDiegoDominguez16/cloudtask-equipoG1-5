

<p align="center">
  <img src="logo/isotipo-nexo.svg" alt="nexo" width="90">
</p>

<h1 align="center">nexo</h1>

<p align="center">
  Gestor de tareas personales y de equipo desplegado en la nube.
</p>

<p align="center">
  <strong>Organiza. Prioriza. Conecta.</strong>
</p>

---

##  Sobre el proyecto

**nexo** es una aplicación web para la gestión de tareas personales o de un equipo de trabajo.

El proyecto fue desarrollado como parte de la materia **Seminario de Ingeniería de Software** y busca demostrar el proceso completo de construcción y despliegue de una aplicación web, desde su desarrollo local hasta su integración con servicios administrados y cloud.

La solución utiliza tecnologías web estándar y servicios como **GitHub, Vercel, Supabase, PostgreSQL y Cloudflare**, integrándolos dentro de una arquitectura orientada a una aplicación web accesible desde Internet.


##  Características

-  Creación de tareas.
-  Descripción opcional para cada tarea.
-  Fecha límite.
-  Prioridad baja, media y alta.
-  Marcado de tareas como completadas.
-  Eliminación de tareas.
-  Filtrado entre todas, pendientes y completadas.
-  Calendario mensual.
-  Vista semanal.
-  Identificación de tareas vencidas.
-  Tema claro y oscuro.
-  Sincronización de tareas en tiempo real.
-  Diseño responsive.
-  Consideraciones de accesibilidad.


##  Arquitectura

La aplicación integra diferentes servicios especializados para cubrir el desarrollo, control de versiones, despliegue, persistencia y acceso a la aplicación.

```text
                         ┌──────────────────┐
                         │      Usuario     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Cloudflare    │
                         │  DNS / HTTPS /   │
                         │     Access       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Cloudflare       │
                         │ Worker           │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │      Vercel      │
                         │    Frontend      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     Supabase     │
                         │                  │
                         │   PostgreSQL     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Supabase         │
                         │ Realtime         │
                         └──────────────────┘
```

El flujo de una tarea es el siguiente: el usuario llega a través del dominio configurado en **Cloudflare** (DNS y HTTPS). Un **Cloudflare Worker** recibe la petición y sirve directamente los archivos estáticos del proyecto (HTML, CSS, JS); las rutas bajo `/api` quedan reservadas para redirigirse al despliegue en **Vercel** si en algún momento se necesita lógica adicional del lado del servidor. Una vez cargada la aplicación en el navegador, esta se comunica directamente con **Supabase**, que expone la base de datos **PostgreSQL** y el canal de **Realtime** usado para sincronizar tareas entre sesiones sin recargar la página.

**Nota:** el dominio propio en Cloudflare todavía está en proceso de aprobación, por lo que mientras tanto la aplicación se puede acceder directamente desde la URL de Vercel.


##  ¿Por qué "nexo"?

El proyecto nació con el nombre de trabajo **CloudTasks**, heredado del laboratorio del curso, pero el equipo decidió renombrar la aplicación final a **nexo**.

La razón es sencilla: la herramienta no solo guarda tareas, sino que actúa como **punto de unión** entre las distintas piezas que hacen falta para organizarse: las tareas propias y las del equipo, las fechas límite, las prioridades y el estado de avance, todo sincronizado en un mismo lugar y en tiempo real. "Nexo" —del latín *nexus*, unión o vínculo— resume esa idea mejor que un nombre puramente descriptivo como CloudTasks: es el hilo que conecta a las personas con lo que tienen pendiente, y a los integrantes del equipo entre sí.

##  Estructura del proyecto

```text
cloudtask-equipoG1-5/
├── index.html              # Punto de entrada de la aplicación
├── css/
│   └── styles.css          # Estilos, temas claro/oscuro y diseño responsive
├── js/
│   ├── app.js               # Lógica principal: CRUD de tareas, filtros, tema
│   ├── calendario.js         # Vista de calendario mensual y semanal
│   ├── realtime.js           # Suscripción a cambios en tiempo real (Supabase)
│   └── supabaseCliente.js    # Configuración del cliente de Supabase
├── logo/
│   ├── favicon.svg
│   └── isotipo-nexo.svg
├── worker.js               # Cloudflare Worker: sirve estáticos y reenvía /api a Vercel
└── wrangler.toml           # Configuración del despliegue en Cloudflare Workers
```

##  Cómo ejecutar el proyecto localmente

No requiere instalación de dependencias ni proceso de build, ya que es HTML, CSS y JavaScript planos.

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/JuanDiegoDominguez16/cloudtask-equipoG1-5.git
   cd cloudtask-equipoG1-5
   ```
2. Servir la carpeta con cualquier servidor estático (por ejemplo, la extensión *Live Server* de VS Code, o):
   ```bash
   npx serve .
   ```
3. Abrir la URL indicada por el servidor en el navegador.

La aplicación se conecta a la instancia de Supabase configurada en `js/supabaseCliente.js`, por lo que basta con tener conexión a internet; no es necesario levantar una base de datos local.

##  Equipo

Proyecto desarrollado por el equipo **G1** para el curso Seminario de Ingeniería de Software (Universidad Icesi):

- Juan Diego Domínguez
- Isabella Sandoval
- Emmanuel Muñoz 
- Juan Fernando Devia
- Felipe Cuadros


