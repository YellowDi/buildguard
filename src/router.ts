import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'taskList',
      component: () => import('./components/task/TaskList.vue'),
    },
    {
      path: '/task/:id',
      name: 'taskDetail',
      component: () => import('./components/task/TaskDetail.vue'),
    },
  ],
})

export default router
