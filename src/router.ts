import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./components/auth/Login.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      name: 'taskList',
      component: () => import('./components/task/TaskList.vue'),
      meta: { title: '任务工作台' },
    },
    {
      path: '/task/:id',
      name: 'taskDetail',
      component: () => import('./components/task/TaskDetail.vue'),
      meta: { title: '任务详情' },
    },
  ],
})

// 路由切换时同步 document.title（仅当前页面标题，便于迁移到微信小程序）
router.afterEach((to) => {
  const title = to.meta?.title as string | undefined
  if (title) document.title = title
})

export default router
