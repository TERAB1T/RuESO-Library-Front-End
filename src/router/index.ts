import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LibraryView from '@/views/LibraryView.vue'
import BookView from '@/views/BookView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
    }
  ],
})

export default router
