import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LibraryView from '@/views/LibraryView.vue'
import BookView from '@/views/BookView.vue'
import GlossaryView from '@/views/GlossaryView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
	history: import.meta.env.SSR
		? createMemoryHistory()
		: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
		},
		{
			path: '/library',
			name: 'library',
			component: LibraryView,
			children: [
				{
					path: 'category/:categoryId(\\d+):slug?',
					name: 'category',
					component: LibraryView,
					beforeEnter: (to, from, next) => {
						const categoryId = Number(to.params.categoryId);
						if (isNaN(categoryId)) {
							next('/404');
						} else {
							next();
						}
					}
				}
			],
		},
		{
			path: '/library/:bookId(\\d+):slug?',
			name: 'book',
			component: BookView,
			beforeEnter: (to, from, next) => {
				const bookId = Number(to.params.bookId);
				if (isNaN(bookId)) {
					next('/404');
				} else {
					next();
				}
			}
		},
		{
			path: '/glossary',
			name: 'glossary',
			component: GlossaryView,
		},
        {
            path: '/:catchAll(.*)',
            name: 'not-found',
            component: NotFoundView,
			alias: '/404',
        }
	],
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			return savedPosition;
		} else {
			return { top: 0 };
		}
	}
});

export default router;
