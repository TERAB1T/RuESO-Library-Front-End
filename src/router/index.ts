import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LibraryView from '@/views/LibraryView.vue'
import BookView from '@/views/BookView.vue'
import GlossaryTESView from '@/views/GlossaryTESView.vue'
import GlossaryFalloutView from '@/views/GlossaryFalloutView.vue'
import BooksExportView from '@/views/BooksExportView.vue'
import F76AtomicShopView from '@/views/F76AtomicShopView.vue'
import F76AtomicShopItemView from '@/views/F76AtomicShopItemView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

export default function createAppRouter() {
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
				path: '/library/eso',
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
					},
					{
						path: 'patch/:patchVersion(\\d{1,2}\\.\\d{1,2}):slug?',
						name: 'patch',
						component: LibraryView,
					}
				],
			},
			{
				path: '/library/eso/:bookId(\\d+):slug?',
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
				path: '/glossary-tes',
				name: 'glossary-tes',
				component: GlossaryTESView,
			},
			{
				path: '/glossary-fallout',
				name: 'glossary-fallout',
				component: GlossaryFalloutView,
			},
			{
				path: '/f76-atomic-shop',
				name: 'atomic-shop',
				component: F76AtomicShopView,
				children: [
					{
						path: 'category/:categoryFormId([a-f0-9]{8}):slug?',
						name: 'atomic-shop-category',
						component: F76AtomicShopView,
					},
					{
						path: 'subcategory/:subcategoryFormId([a-f0-9]{8}):slug?',
						name: 'atomic-shop-subcategory',
						component: F76AtomicShopView,
					}
				],
			},
			{
				path: '/f76-atomic-shop/:itemFormId([a-fA-F0-9]{8}):slug?',
				name: 'atomic-shop-item',
				component: F76AtomicShopItemView,
			},
			{
				path: '/books-export',
				name: 'books-export',
				component: BooksExportView,
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

	return router;
}
