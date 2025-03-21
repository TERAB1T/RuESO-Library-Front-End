import { renderToString } from 'vue/server-renderer'

import { createApp } from './main'
import { renderSSRHead } from '@unhead/ssr'

import { dehydrate } from '@tanstack/vue-query';

export async function render(_url: string) {
	const { app, router, head, queryClient } = createApp();

	await router.push(_url);
	await router.isReady();

	const ctx = {};
	const html = await renderToString(app, ctx);

	const vueQueryState = { toJSON: () => dehydrate(queryClient) };

	const payload = await renderSSRHead(head);

	return [html, payload, vueQueryState];
}
