import fs from 'node:fs/promises';
import path from "path";
import { fileURLToPath } from "url";
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { LRUCache } from 'lru-cache';

const isWindows = process.platform === 'win32';
const SOCKET_PATH = '/tmp/ssrRueso.sock';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p: string) => path.resolve(__dirname, p);
const templateHtml = await fs.readFile(resolve("dist/client/index.html"), "utf-8");
const port = process.env.PORT || 6173;

const ssrCache = new LRUCache<string, string>({
	max: 500,
	ttl: 1000 * 60 * 1, // 1 minute
});

const NO_CACHE_PATHS = ['/books-export', 'api'];

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

			const shouldCache = !NO_CACHE_PATHS.some(path => url.startsWith(path));

			if (shouldCache) {
				const cached = ssrCache.get(url);
				if (cached) {
					return new Response(cached, {
						headers: {
							"Content-Type": "text/html",
							"X-Cache": "HIT",
						},
					});
				}
			}

			let template: string;
			let render: any;
			template = templateHtml;
			render = (await import("./dist/server/entry-server.js")).render;

			const [rendered, payload, vueQueryState] = await render(url);

			const headTags = payload?.headTags ?? '';
			if (headTags.includes("Страница не найдена")) {
				set.status = 404;
			}

			Object.entries(payload).forEach(([key, value]) => {
				template = template.replace(`<!--${key}-->`, String(value));
			});

			const html = template
				.replace(`<!--app-html-->`, rendered ?? '')
				.replace(`<!--vue-query-state-->`, `<script>window.__VUE_QUERY_STATE__ = ${JSON.stringify(JSON.stringify(vueQueryState))}</script>`);

			if (shouldCache && set.status === 200) {
				ssrCache.set(url, html);
			}

			return new Response(html, {
				headers: {
					"Content-Type": "text/html",
					"X-Cache": shouldCache ? "MISS" : "BYPASS",
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
