import fs from 'node:fs/promises';
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer as createViteServer } from "vite";

import type { Request, Response } from "express";
import type { ViteDevServer } from "vite";

const isProd = process.env.NODE_ENV === "production";
const port = process.env.PORT || 6173;
const base = process.env.BASE || '/';

export async function createServer(
	root: string = process.cwd(),
	hmrPort?: number
): Promise<{ app: express.Express; vite?: ViteDevServer }> {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const resolve = (p: string) => path.resolve(__dirname, p);

	// Preload production files if in production mode
	const templateHtml = isProd
		? await fs.readFile(resolve("dist/client/index.html"), "utf-8")
		: "";

	const app = express();

	let vite: ViteDevServer | undefined;

	// Universal route handler
	app.use("*all", async (req: Request, res: Response) => {
		try {
			const url = req.originalUrl;

			let template: string;
			let render: any;

			if (!isProd) {
				// Development: Load template and SSR module dynamically
				template = await fs.readFile(resolve("index.html"), "utf-8");
				template = await vite!.transformIndexHtml(url, template);
				render = (await vite!.ssrLoadModule("/src/entry-server.ts")).render;
			} else {
				// Production: Use preloaded template and SSR module
				template = templateHtml;
				render = (await import("./dist/server/entry-server.js")).render;
			}

			// Render the app and inject into the template
			const [rendered, payload] = await render(url);

			Object.entries(payload).forEach(([key, value]) => {
				template = template.replace(`<!--${key}-->`, String(value));
			});

			const html = template
				.replace(`<!--app-html-->`, rendered ?? '');

			res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
		} catch (e: any) {
			vite?.ssrFixStacktrace(e);
			console.log(e.stack);
			res.status(500).end(e.stack);
		}
	});

	return { app, vite };
}

createServer().then(({ app }) => {
	app.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
	});
});
