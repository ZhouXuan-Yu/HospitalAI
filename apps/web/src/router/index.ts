import { createRouter, createWebHistory } from 'vue-router'
import DoctorWorkbench from '../views/DoctorWorkbench.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/workbench/E001' },
    { path: '/workbench/:encounterId', component: DoctorWorkbench }
  ]
})
