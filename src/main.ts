import { createSSRApp } from 'vue';
import App from './App.vue';
import createAppRouter from "./router";
import {
	QueryClient,
	VueQueryPlugin,
	hydrate,
} from '@tanstack/vue-query';
import { createHead as createClientHead } from '@unhead/vue/client';
import { createHead as createServerHead } from '@unhead/vue/server';

export function createApp(initialState = {}) {
	const app = createSSRApp(App);

	const head = import.meta.env.SSR ? createServerHead({ disableDefaults: true }) : createClientHead();
	app.use(head);

	const router = createAppRouter();
	app.use(router);

	const queryClient = new QueryClient();

	if (initialState) {
		hydrate(queryClient, initialState);
	}

	app.use(VueQueryPlugin, { queryClient });

	return { app, router, head, queryClient };
}
