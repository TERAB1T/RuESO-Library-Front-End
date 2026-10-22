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

let ssrManifest: Record<string, string[]> = {};
try {
	ssrManifest = JSON.parse(await fs.readFile(resolve("dist/client/.vite/ssr-manifest.json"), "utf-8"));
} catch {
	console.log("SSR manifest not found, CSS for code-split chunks won't be preloaded in the initial HTML");
}

function renderCssLinks(modules: Set<string>, manifest: Record<string, string[]>): string {
	const files = new Set<string>();

	for (const id of modules) {
		for (const file of manifest[id] ?? []) {
			if (file.endsWith(".css")) files.add(file);
		}
	}

	return Array.from(files).map(file => `<link rel="stylesheet" href="${file}">`).join("");
}

const ssrCache = new LRUCache<string, string>({
	max: 500,
	ttl: 1000 * 60 * 1, // 1 minute
});

const NO_CACHE_PATHS = ['/books-export', '/api'];

// Only these query params change the rendered page; others (ysclid, utm_*, scanner junk)
// would otherwise create a separate cache entry per URL.
const CACHE_KEY_PARAMS = ['filter', 'hasSupport', 'isPTS', 'page'];

function getCacheKey(urlObj: URL): string {
	const params = CACHE_KEY_PARAMS
		.filter(name => urlObj.searchParams.has(name))
		.map(name => `${name}=${encodeURIComponent(urlObj.searchParams.get(name)!)}`);

	return params.length ? `${urlObj.pathname}?${params.join('&')}` : urlObj.pathname;
}

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
			const cacheKey = getCacheKey(urlObj);

			if (shouldCache) {
				const cached = ssrCache.get(cacheKey);
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

			const [rendered, payload, vueQueryState, modules, status] = await render(url);

			const cssLinks = renderCssLinks(modules, ssrManifest);
			payload.headTags = `${payload?.headTags ?? ''}${cssLinks}`;

			// Replacements are passed as functions: a replacement string would treat
			// $&, $` and $' in page content as special patterns.
			Object.entries(payload).forEach(([key, value]) => {
				template = template.replace(`<!--${key}-->`, () => String(value));
			});

			// Escaping "<" keeps "</script" in the data from closing the tag early;
			// \u003c turns back into "<" when the browser reads the string literal.
			const serializedState = JSON.stringify(JSON.stringify(vueQueryState)).replace(/</g, '\\u003c');

			const html = template
				.replace(`<!--app-html-->`, () => rendered ?? '')
				.replace(`<!--vue-query-state-->`, () => `<script>window.__VUE_QUERY_STATE__ = ${serializedState}</script>`);

			if (shouldCache && status === 200) {
				ssrCache.set(cacheKey, html);
			}

			return new Response(html, {
				status,
				headers: {
					"Content-Type": "text/html",
					"X-Cache": shouldCache ? "MISS" : "BYPASS",
					...(status === 503 && { "Retry-After": "60" }),
				},
			});
		} catch (e) {
			if (e instanceof Error) {
				console.log(e.stack);
			} else console.log(e);

			set.status = 500;
			return new Response("Internal Server Error. Please try again later.", {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}
	})
	.listen(isWindows ? { port } : { unix: SOCKET_PATH }, () => {
		console.log(isWindows
			? `Server running on http://localhost:${port}`
			: `Server running on Unix socket: ${SOCKET_PATH}`);
	});
