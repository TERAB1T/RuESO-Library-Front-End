import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'

const HomeView = () => import('@/views/HomeView.vue')
const PartnersView = () => import('@/views/PartnersView.vue')
const LibraryView = () => import('@/views/eso-library/LibraryView.vue')
const BookView = () => import('@/views/eso-library/BookView.vue')
const GlossaryTESView = () => import('@/views/glossaries/GlossaryTESView.vue')
const GlossaryFalloutView = () => import('@/views/glossaries/GlossaryFalloutView.vue')
const BooksExportView = () => import('@/views/eso-library/BooksExportView.vue')
const F76AtomicShopView = () => import('@/views/f76-atomic-shop/F76AtomicShopView.vue')
const F76AtomicShopItemView = () => import('@/views/f76-atomic-shop/F76AtomicShopItemView.vue')
const F76CampView = () => import('@/views/f76-camp/F76CampView.vue')
const F76CampItemView = () => import('@/views/f76-camp/F76CampItemView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

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
				path: '/f76-camp',
				name: 'camp',
				component: F76CampView,
				children: [
					{
						path: 'category/:categoryFormId([a-f0-9]{8}):slug?',
						name: 'camp-category',
						component: F76CampView,
					},
					{
						path: 'subcategory/:subcategoryFormId([a-f0-9]{8}):slug?',
						name: 'camp-subcategory',
						component: F76CampView,
					}
				],
			},
			{
				path: '/f76-camp/:itemFormId([a-fA-F0-9]{8}):slug?',
				name: 'camp-item',
				component: F76CampItemView,
			},
			{
				path: '/books-export',
				name: 'books-export',
				component: BooksExportView,
			},
			{
				path: '/partners',
				name: 'partners',
				component: PartnersView,
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
