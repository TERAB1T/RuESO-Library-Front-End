/**
 * SSR regression check: renders pages through the SSR server and compares them.
 *
 *   bun run check:ssr --save [file]        snapshot the pages (default .checks/ssr.json)
 *   bun run check:ssr --compare [file]     render them again and report every difference
 *   bun run check:ssr --reference <url>    compare with another server right now, e.g. https://rueso.ru
 *   bun run check:ssr                      only the invariants below
 *
 * Needs the SSR build running (bun run build, then bun serverElysia.ts) and the API.
 * Per page it compares the status, the <head> tags, the app markup and the hydration state.
 * Asset file hashes and scoped-style ids (data-v-*) are normalized: they differ between any two builds.
 * Against another server, data-dependent parts (DB versions, dates) can differ legitimately;
 * the report shows which part differs and where.
 *
 * Invariants checked on every run: unknown pages answer 404, no loading skeleton reaches the
 * server HTML, the hydration state is escaped (a "</script>" in a URL can't break out of it).
 *
 * Options: --base <url> SSR server (default http://localhost:6173), --api <url> API used to pick
 * existing items/books/categories (default http://localhost:8000). Requests are sequential.
 *
 * Exits with code 1 when a difference or a broken invariant is found.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildPageList, MUST_404 } from "./pages";

const args = process.argv.slice(2);
const option = (name: string) => {
	const i = args.indexOf(name);
	return i === -1 ? undefined : args[i + 1]?.startsWith("--") ? "" : (args[i + 1] ?? "");
};

const DEFAULT_SNAPSHOT = join(import.meta.dir, "..", ".checks", "ssr.json");
const saveTo = option("--save");
const compareTo = option("--compare");
const reference = option("--reference") || undefined;
const base = option("--base") || "http://localhost:6173";
const api = option("--api") || "http://localhost:8000";

type Page = { status: number; head: string; app: string; state: string };
type Snapshot = { createdAt: string; pages: Record<string, Page> };

const STATE_RE = /<script>window\.__VUE_QUERY_STATE__ = (".*?")<\/script>/s;

function parsePage(status: number, html: string): Page {
	const head = (html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "")
		.match(/<title>[^<]*<\/title>|<meta (?:name|property)="[^"]*" content="[^"]*"|<link rel="canonical"[^>]*>|<script type="application\/ld\+json"[^>]*>[^<]*<\/script>/g) ?? [];

	const appMatch = html.match(/<div id="app">([\s\S]*)<\/div>\s*<\/body>/);
	if (!appMatch) throw new Error("app markup not found in the SSR HTML");
	const app = appMatch[1]
		.replace(/\/assets\/[^"' )]+/g, "/assets/X")
		.replace(/data-v-[0-9a-f]{8}/g, "data-v-X");

	const rawState = html.match(STATE_RE)?.[1];
	const queries = rawState ? JSON.parse(JSON.parse(rawState)).queries ?? [] : [];
	const state = JSON.stringify(queries.map((q: any) => ({ key: q.queryKey, status: q.state.status, data: q.state.data })));

	return { status, head: head.sort().join("\n"), app, state };
}

async function render(server: string, path: string): Promise<Page> {
	const response = await fetch(server + path);
	return parsePage(response.status, await response.text());
}

/** Shows where two strings start to differ. */
function firstDifference(a: string, b: string): string {
	let i = 0;
	while (i < a.length && a[i] === b[i]) i++;
	return `\n        was: …${a.slice(Math.max(0, i - 50), i + 70)}\n        now: …${b.slice(Math.max(0, i - 50), i + 70)}`;
}

const notes: string[] = [];

/**
 * Queries are matched by key. A query present on one side only is a note, not a difference: pages
 * also start queries they don't wait for on the server, and whether those finish before the render
 * ends is a matter of timing.
 */
function compareStates(path: string, before: string, after: string): string[] {
	type Query = { key: unknown; status: string; data: unknown };
	const index = (state: string) => new Map((JSON.parse(state) as Query[]).map(q => [JSON.stringify(q.key), JSON.stringify(q)]));
	const a = index(before), b = index(after);
	const differences: string[] = [];
	for (const [key, query] of a) {
		if (!b.has(key)) notes.push(`${path}  query only in the first render: ${key}`);
		else if (b.get(key) !== query) differences.push(`state ${key}:${firstDifference(query, b.get(key)!)}`);
	}
	for (const key of b.keys()) if (!a.has(key)) notes.push(`${path}  query only in the second render: ${key}`);
	return differences;
}

function comparePages(path: string, before: Page, after: Page): string[] {
	const parts: string[] = [];
	if (before.status !== after.status) parts.push(`status ${before.status} → ${after.status}`);
	for (const part of ["head", "app"] as const) {
		if (before[part] !== after[part]) parts.push(`${part}:${firstDifference(before[part], after[part])}`);
	}
	parts.push(...compareStates(path, before.state, after.state));
	return parts.map(p => `${path}  ${p}`);
}

const problems: string[] = [];

// Invariants
for (const path of MUST_404) {
	const response = await fetch(base + path);
	if (response.status !== 404) problems.push(`expected 404, got ${response.status}: ${path}`);
}
const probe = "</script><b>check-ssr-probe</b>";
const probeHtml = await (await fetch(`${base}/f76-atomic-shop?filter=${encodeURIComponent(probe)}`)).text();
if (probeHtml.includes(probe)) problems.push("the hydration state is not escaped: a </script> from the URL reached the HTML");

const pages = saveTo === undefined && compareTo !== undefined
	? Object.keys((await Bun.file(compareTo || DEFAULT_SNAPSHOT).json() as Snapshot).pages)
	: await buildPageList(api);

const rendered: Record<string, Page> = {};
for (const path of pages) {
	const page = rendered[path] = await render(base, path);
	if (page.status !== 200) problems.push(`expected 200, got ${page.status}: ${path}`);
	if (/class="[^"]*\b(skeleton|placeholder)\b/.test(page.app)) problems.push(`loading skeleton in the server HTML: ${path}`);
	if (page.state.includes("</script")) problems.push(`unescaped </script in the hydration state: ${path}`);
}
console.log(`invariants: ${MUST_404.length} not-found pages, escaping probe, ${pages.length} pages rendered`);

if (saveTo !== undefined) {
	const file = saveTo || DEFAULT_SNAPSHOT;
	mkdirSync(dirname(file), { recursive: true });
	await Bun.write(file, JSON.stringify({ createdAt: new Date().toISOString(), pages: rendered } satisfies Snapshot));
	console.log(`saved ${pages.length} pages to ${file}`);
}

if (compareTo !== undefined) {
	const file = compareTo || DEFAULT_SNAPSHOT;
	const snapshot: Snapshot = await Bun.file(file).json();
	const differences = pages.flatMap(path => comparePages(path, snapshot.pages[path], rendered[path]));
	console.log(`compared ${pages.length} pages with ${file} (${snapshot.createdAt}): ${differences.length} differences`);
	differences.forEach(d => console.log("  " + d));
	if (differences.length) problems.push(`${differences.length} differences from the snapshot`);
}

if (reference) {
	const differences: string[] = [];
	for (const path of pages) differences.push(...comparePages(path, await render(reference, path), rendered[path]));
	console.log(`compared ${pages.length} pages with ${reference} ("was" = reference, "now" = ${base}): ${differences.length} differences`);
	differences.forEach(d => console.log("  " + d));
	if (differences.length) problems.push(`${differences.length} differences from ${reference}`);
}

if (notes.length) console.log(`\nnotes:\n  ${notes.join("\n  ")}`);

if (problems.length) {
	console.log(`\nFAILED:\n  ${problems.slice(0, 20).join("\n  ")}`);
	process.exit(1);
}
console.log("\nOK");
