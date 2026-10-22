import { renderToString } from 'vue/server-renderer'

import { createApp } from './main'
import { renderSSRHead } from '@unhead/vue/server'

import { dehydrate } from '@tanstack/vue-query';

export async function render(_url: string) {
	const { app, router, head, queryClient } = createApp();

	await router.push(_url);
	await router.isReady();

	const ctx: { modules?: Set<string>; notFound?: boolean } = {};
	const html = await renderToString(app, ctx);

	// A failed API request leaves the page incomplete: 503 makes crawlers keep their old copy
	// instead of indexing an empty page.
	const hasFailedQuery = queryClient.getQueryCache().getAll().some(query => query.state.status === 'error');
	const status = hasFailedQuery ? 503 : ctx.notFound ? 404 : 200;

	const vueQueryState = { toJSON: () => dehydrate(queryClient) };

	const payload = await renderSSRHead(head);

	return [html, payload, vueQueryState, ctx.modules ?? new Set<string>(), status];
}
