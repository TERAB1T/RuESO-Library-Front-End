/**
 * Browser regression check: opens the SSR build in Chromium.
 *
 *   bun run check:browser
 *
 * Needs the SSR build running (bun run build, then bun serverElysia.ts) and the API. Locally the SSR
 * server doesn't serve /api, so the browser's /api requests are routed to the API from here.
 * Requests to other hosts (analytics) are blocked.
 *
 *   hydration   every page hydrates without errors or mismatch warnings
 *   prefetch    hovering a link prefetches its data and the click reuses it (no second request)
 *   not found   client-side navigation to a missing page shows the 404 page, and leaving it works
 *   layout      layout shift (CLS) while images load slowly, desktop and mobile. /public/img isn't
 *               served locally: images are stubbed with a square, as item images and book icons are
 *               (.json files there, like the map icon atlas, are read from the local public/)
 *
 * Options: --base <url> SSR server (default http://localhost:6173), --api <url> (default
 * http://localhost:8000), --chromium <chrome.exe> (default: $PLAYWRIGHT_CHROMIUM, else the newest
 * Chromium installed by Playwright in %LOCALAPPDATA%\ms-playwright).
 *
 * Exits with code 1 when a check fails.
 */
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { buildPageList, MUST_404 } from "./pages";

const args = process.argv.slice(2);
const option = (name: string) => {
	const i = args.indexOf(name);
	return i === -1 ? undefined : args[i + 1];
};

const base = option("--base") || "http://localhost:6173";
const api = option("--api") || "http://localhost:8000";

const DESKTOP = { width: 1400, height: 900 };
const MOBILE = { width: 390, height: 844 };
const CLS_LIMIT = 0.1;
// 1×1 PNG: square, like the item images and book icons it stands in for.
const SQUARE_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

function findChromium(): string {
	const explicit = option("--chromium") || process.env.PLAYWRIGHT_CHROMIUM;
	if (explicit) return explicit;
	const root = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
	let found: string[] = [];
	try {
		found = [...new Bun.Glob("chromium-*/chrome-win64/chrome.exe").scanSync({ cwd: root })];
	} catch {}
	const newest = found.sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0])).at(-1);
	if (!newest) throw new Error(`no Chromium in ${root}: pass --chromium <path to chrome.exe>`);
	return join(root, newest);
}

const browser = await chromium.launch({ executablePath: findChromium() });
const problems: string[] = [];
const notes: string[] = [];

type Opened = { page: Page; apiRequests: string[]; errors: string[] };

/** A page whose /api goes to the API, other hosts are blocked and /public/img answers with a square after imageDelay ms. */
async function openPage(viewport = DESKTOP, imageDelay = 0): Promise<Opened> {
	const page = await browser.newPage({ viewport });
	const opened: Opened = { page, apiRequests: [], errors: [] };
	const origin = new URL(base).origin;

	await page.route("**/*", async route => {
		const url = new URL(route.request().url());
		if (url.origin !== origin) return route.abort();
		if (url.pathname.startsWith("/api/")) {
			const path = url.pathname.slice(4) + url.search;
			opened.apiRequests.push(path);
			const response = await fetch(api + path);
			return route.fulfill({ status: response.status, contentType: response.headers.get("content-type") ?? undefined, body: Buffer.from(await response.arrayBuffer()) });
		}
		if (url.pathname.startsWith("/public/img/")) {
			// Data files next to the images (the map's icon atlas description) come from the local public/
			if (url.pathname.endsWith(".json")) {
				const file = Bun.file("." + decodeURIComponent(url.pathname));
				return (await file.exists())
					? route.fulfill({ status: 200, contentType: "application/json", body: Buffer.from(await file.arrayBuffer()) })
					: route.fulfill({ status: 404 });
			}
			await Bun.sleep(imageDelay);
			return route.fulfill({ status: 200, contentType: "image/png", body: SQUARE_PNG });
		}
		return route.continue();
	});
	page.on("console", m => {
		if ((m.type() === "error" && !m.text().startsWith("Failed to load resource")) || /hydrat/i.test(m.text())) opened.errors.push(m.text().slice(0, 200));
	});
	page.on("pageerror", e => opened.errors.push(`page error: ${e.message}`));
	return opened;
}

async function settle(page: Page, ms = 300) {
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(ms);
}

const routerPush = (page: Page, path: string) =>
	page.evaluate(p => (document.querySelector("#app") as any).__vue_app__.config.globalProperties.$router.push(p), path);

const pages = await buildPageList(api);

// Hydration
for (const path of [...pages, ...MUST_404]) {
	const { page, apiRequests, errors } = await openPage();
	await page.goto(base + path);
	await settle(page);
	errors.forEach(e => problems.push(`hydration ${path}: ${e}`));
	// Pages also start queries they don't wait for on the server; a request here is only worth a look.
	if (apiRequests.length) notes.push(`requested after hydration ${path}: ${apiRequests.join(", ")}`);
	await page.close();
}
console.log(`hydration: ${pages.length + MUST_404.length} pages`);

// Prefetch
const PREFETCH_CASES: [string, RegExp][] = [
	["/f76-atomic-shop", /^\/f76-atomic-shop\/[0-9a-f]{8}-/],
	["/f76-atomic-shop", /^\/f76-atomic-shop\/category\//],
	["/f76-camp", /^\/f76-camp\/[0-9a-f]{8}-/],
	["/f76-camp", /^\/f76-camp\/category\//],
	["/library/eso", /^\/library\/eso\/\d+-/],
	["/library/eso", /^\/library\/eso\/category\//],
];
for (const [start, linkPattern] of PREFETCH_CASES) {
	const { page, apiRequests, errors } = await openPage();
	await page.goto(base + start);
	await settle(page, 500);
	const href = await page.evaluate(source => [...document.querySelectorAll("a[href]")]
		.find(a => new RegExp(source).test(a.getAttribute("href")!) && a.getBoundingClientRect().width > 0)
		?.getAttribute("href"), linkPattern.source);
	if (!href) {
		problems.push(`prefetch ${start}: no visible link matching ${linkPattern}`);
		await page.close();
		continue;
	}
	const link = page.locator(`a[href="${href}"]`).filter({ visible: true }).first();
	apiRequests.length = 0;
	await link.hover();
	await page.waitForTimeout(900);
	const onHover = [...apiRequests];
	apiRequests.length = 0;
	await link.click();
	await settle(page);
	const repeated = apiRequests.filter(r => onHover.includes(r));
	if (!onHover.length) problems.push(`prefetch ${start} → ${href}: nothing requested on hover`);
	else if (repeated.length) problems.push(`prefetch ${start} → ${href}: requested again on click: ${repeated.join(", ")}`);
	errors.forEach(e => problems.push(`prefetch ${start} → ${href}: ${e}`));
	await page.close();
}
console.log(`prefetch: ${PREFETCH_CASES.length} links`);

// Not found on client-side navigation
{
	const { page, errors } = await openPage();
	await page.goto(base + "/f76-camp");
	await settle(page);
	const showsNotFound = () => page.evaluate(() => !!document.querySelector(".error-container"));
	for (const path of MUST_404) {
		await routerPush(page, path);
		await settle(page);
		if (!await showsNotFound()) problems.push(`not found: client navigation to ${path} doesn't show the 404 page`);
		await routerPush(page, "/f76-atomic-shop");
		await settle(page);
		if (await showsNotFound()) problems.push(`not found: the 404 page stays after leaving ${path}`);
	}
	errors.forEach(e => problems.push(`not found: ${e}`));
	await page.close();
}
console.log(`not found: ${MUST_404.length} client navigations`);

// Layout shift
const shifts: [number, string][] = [];
for (const path of pages) for (const [viewport, name] of [[DESKTOP, "desktop"], [MOBILE, "mobile"]] as const) {
	const { page } = await openPage(viewport, 1000);
	await page.addInitScript(() => {
		(window as any).__cls = 0;
		new PerformanceObserver(list => {
			for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) (window as any).__cls += entry.value;
		}).observe({ type: "layout-shift", buffered: true });
	});
	await page.goto(base + path);
	await settle(page);
	const cls: number = await page.evaluate(() => (window as any).__cls);
	shifts.push([cls, `${cls.toFixed(3)} ${name} ${path}`]);
	if (cls > CLS_LIMIT) problems.push(`layout shift ${cls.toFixed(3)} (limit ${CLS_LIMIT}) ${name} ${path}`);
	await page.close();
}
console.log(`layout: ${shifts.length} loads, worst: ${shifts.sort((a, b) => b[0] - a[0]).slice(0, 3).map(s => s[1]).join(" | ")}`);

await browser.close();

if (notes.length) console.log(`\nnotes:\n  ${notes.join("\n  ")}`);

if (problems.length) {
	console.log(`\nFAILED:\n  ${problems.slice(0, 30).join("\n  ")}`);
	process.exit(1);
}
console.log("\nOK");
