import "bootstrap";
import './assets/main.scss';

import { createSSRApp } from 'vue';
import App from './App.vue';
import router from "./router";
import { createHead } from '@unhead/vue';

export function createApp() {
	const app = createSSRApp(App);

	const head = createHead();
	app.use(head);

	app.use(router);

	return { app, router };
}
