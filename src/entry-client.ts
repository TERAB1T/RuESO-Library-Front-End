import "bootstrap";
import './assets/main.scss';
import { createApp } from "./main";

declare global {
  interface Window {
	__VUE_QUERY_STATE__?: string;
  }
}

const initialState = window.__VUE_QUERY_STATE__ ? JSON.parse(window.__VUE_QUERY_STATE__) : {};

const { app, router } = createApp(initialState);

router.isReady().then(() => {
	app.mount("#app");

	console.log("hydrated");
});
