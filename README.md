# nexo

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

---

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

---



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
---

 