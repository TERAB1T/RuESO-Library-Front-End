import fs from 'node:fs/promises';
import path from "path";
import { fileURLToPath } from "url";
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";

const isWindows = process.platform === 'win32';
const SOCKET_PATH = '/tmp/ssrRueso.sock';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p: string) => path.resolve(__dirname, p);
const templateHtml = await fs.readFile(resolve("dist/client/index.html"), "utf-8");
const port = process.env.PORT || 6173;

new Elysia()
	.use(staticPlugin({
		assets: "dist/client/assets",
		prefix: "/assets",
		alwaysStatic: false,
	}))
	.all("*", async ({ request, set }) => {
		try {
			const urlObj = new URL(request.url);
			const url = urlObj.pathname + urlObj.search;

			let template: string;
			let render: any;
			template = templateHtml;
			render = (await import("./dist/server/entry-server.js")).render;

			const [rendered, payload, vueQueryState] = await render(url);

			Object.entries(payload).forEach(([key, value]) => {
				template = template.replace(`<!--${key}-->`, String(value));
			});

			const html = template
				.replace(`<!--app-html-->`, rendered ?? '')
				.replace(`<!--vue-query-state-->`, `<script>window.__VUE_QUERY_STATE__ = ${JSON.stringify(JSON.stringify(vueQueryState))}</script>`);

			return new Response(html, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		} catch (e) {
			if (e instanceof Error) {
				console.log(e.stack);
				set.status = 500;

				return e.stack;
			} else console.log(e);
		}
	})
	.listen(isWindows ? { port } : { unix: SOCKET_PATH }, () => {
		console.log(isWindows
			? `Server running on http://localhost:${port}`
			: `Server running on Unix socket: ${SOCKET_PATH}`);
	});
