export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Ejemplo: solo las rutas que empiecen con /api van a Vercel/Supabase,
        // el resto (tu index.html, css, js) se sirve como archivos estáticos
        if (url.pathname.startsWith("/api")) {
            const target = "https://cloudtask-equipo-g1-5-nwj4p8ksa-juandiego0416-7200s-projects.vercel.app" + url.pathname + url.search;
            const proxied = new Request(target, request);
            const response = await fetch(proxied);
            return new Response(response.body, response);
        }

        return env.ASSETS.fetch(request);
    }
};