import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
	publicDir: false,
	plugins: [
		vue(),
		//vueDevTools(),
	],
	server: {
		port: 3000,
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			}
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'~bootstrap': fileURLToPath(new URL('./node_modules/bootstrap', import.meta.url)),
		},
	},
	css: {
		preprocessorOptions: {
			scss: {
				quietDeps: true,
			},
		},
	},
	build: {
		sourcemap: false
	}
})
