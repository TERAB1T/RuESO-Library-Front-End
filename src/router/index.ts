import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LibraryView from '@/views/LibraryView.vue'
import BookView from '@/views/BookView.vue'
import GlossaryView from '@/views/GlossaryView.vue'

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
          path: 'category/:categoryId',
          name: 'category',
          component: LibraryView,
        }
      ],
    },
    {
      path: '/library/:bookId',
      name: 'book',
      component: BookView,
    },
    {
      path: '/glossary',
      name: 'glossary',
      component: GlossaryView,
    },
  ],
})

export default router;
