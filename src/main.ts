import "bootstrap";
import './assets/main.scss';

import { createSSRApp } from 'vue';
import App from './App.vue';
import router from "./router";
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createHead, setHeadInjectionHandler } from '@unhead/vue';

export function createApp() {
	const app = createSSRApp(App);

	const head = createHead();
	setHeadInjectionHandler(() => head);

	app.use(router);
	app.use(VueQueryPlugin);

	return { app, router };
}
