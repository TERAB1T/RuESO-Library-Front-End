import { renderToString } from 'vue/server-renderer'

import { createApp } from './main'
import { renderSSRHead } from '@unhead/ssr'

export async function render(_url: string) {
	const { app, router, head } = createApp();

	await router.push(_url);
	await router.isReady();

	const ctx = {};
	const html = await renderToString(app, ctx);

	const payload = await renderSSRHead(head);

	return [html, payload];
}
