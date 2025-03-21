import { createSSRApp } from 'vue';
import App from './App.vue';
import router from "./router";
import {
	QueryClient,
	VueQueryPlugin,
	hydrate,
} from '@tanstack/vue-query';
import { createHead, setHeadInjectionHandler } from '@unhead/vue';

export function createApp(initialState = {}) {
	const app = createSSRApp(App);

	const head = createHead();
	setHeadInjectionHandler(() => head);

	app.use(router);

	const queryClient = new QueryClient();

	if (initialState) {
		hydrate(queryClient, initialState);
	}

	app.use(VueQueryPlugin, { queryClient });

	return { app, router, head, queryClient };
}
