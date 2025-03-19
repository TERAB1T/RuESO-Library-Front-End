import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import compression from "compression";
import serveStatic from "serve-static";
import { createServer as createViteServer } from "vite";
import type { Request, Response } from "express";
import type { ViteDevServer } from "vite";

const isTest = process.env.VITEST === "true";
const isProd = process.env.BUN_ENV === "production";
const DEFAULT_PORT = 6173;

export async function createServer(
    root: string = process.cwd(),
    hmrPort?: number
): Promise<{ app: express.Express; vite?: ViteDevServer }> {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const resolve = (p: string) => path.resolve(__dirname, p);

    // Preload production files if in production mode
    const indexProd = isProd
        ? fs.readFileSync(resolve("dist/client/index.html"), "utf-8")
        : "";
    const manifest = isProd
        ? JSON.parse(
                fs.readFileSync(resolve("dist/client/.vite/ssr-manifest.json"), "utf-8")
          )
        : {};

    const app = express();

    let vite: ViteDevServer | undefined;
    if (!isProd) {
        // Development mode: Configure Vite server
        vite = await createViteServer({
            base: "/",
            root,
            logLevel: isTest ? "error" : "info",
            server: {
                middlewareMode: true,
                watch: {
                    usePolling: true,
                    interval: 100,
                },
                hmr: {
                    port: hmrPort,
                },
            },
            appType: "custom",
        });
        app.use(vite.middlewares);
    } else {
        // Production mode: Use compression and serve static files
        app.use(compression());
        app.use(
            "/",
            serveStatic(resolve("dist/client"), {
                index: false,
            })
        );
    }

    // Universal route handler
    app.use("*", async (req: Request, res: Response) => {
        try {
            const url = req.originalUrl;

            let template: string;
            let render: (url: string, manifest: Record<string, any>) => Promise<[string, string, Record<string, string>]>;

            if (!isProd) {
                // Development: Load template and SSR module dynamically
                template = fs.readFileSync(resolve("index.html"), "utf-8");
                template = await vite!.transformIndexHtml(url, template);
                render = (await vite!.ssrLoadModule("/src/entry-server.ts")).render;
            } else {
                // Production: Use preloaded template and SSR module
                template = indexProd;
                render = (await import("./dist/server/entry-server.js")).render;
            }

            // Render the app and inject into the template
            const [appHtml, preloadLinks, payload] = await render(url, manifest);

            let html = template
                .replace(`<!--preload-links-->`, preloadLinks)
                .replace(`<!--app-html-->`, appHtml);

            Object.entries(payload).forEach(([key, value]) => {
                html = html.replace(`<!--${key}-->`, value);
            });

            res.status(200).set({ "Content-Type": "text/html" }).end(html);
        } catch (error: any) {
            if (vite) vite.ssrFixStacktrace(error);
            console.error("Error during rendering:", error.stack);
            res.status(500).end("Internal Server Error");
        }
    });

    return { app, vite };
}

// Start the server if not in test mode
if (!isTest) {
    createServer().then(({ app }) => {
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    });
}
