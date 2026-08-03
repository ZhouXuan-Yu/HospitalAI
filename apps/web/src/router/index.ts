import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../layouts/AppShell.vue'

const DoctorWorkbench = () => import('../views/DoctorWorkbench.vue')
const PatientWorklist = () => import('../views/PatientWorklist.vue')
const PatientOverview = () => import('../views/PatientOverview.vue')
const MedicationTimeline = () => import('../views/MedicationTimeline.vue')
const PharmacistReviews = () => import('../views/PharmacistReviews.vue')
const RuleGovernance = () => import('../views/RuleGovernance.vue')
const EvidenceCenter = () => import('../views/EvidenceCenter.vue')
const ResearchWorkbench = () => import('../views/ResearchWorkbench.vue')
const KnowledgeReviews = () => import('../views/KnowledgeReviews.vue')
const IntegrationConsole = () => import('../views/IntegrationConsole.vue')
const AuditLog = () => import('../views/AuditLog.vue')
const ApiDocs = () => import('../views/ApiDocs.vue')

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: AppShell, children: [
      { path: '', redirect: '/doctor/worklist' },
      { path: 'doctor/worklist', component: PatientWorklist, meta: { title: '患者工作列表', group: '医生工作区' } },
      { path: 'doctor/workbench/:encounterId', component: DoctorWorkbench, meta: { title: '处方辅助决策', group: '医生工作区', immersive: true } },
      { path: 'doctor/patients/:patientId', component: PatientOverview, meta: { title: '患者用药全景', group: '医生工作区' } },
      { path: 'doctor/timeline/:patientId', component: MedicationTimeline, meta: { title: '长期用药追踪', group: '医生工作区' } },
      { path: 'pharmacy/reviews', component: PharmacistReviews, meta: { title: '风险复核队列', group: '药师工作区' } },
      { path: 'governance/rules', component: RuleGovernance, meta: { title: '临床规则管理', group: '规则与证据' } },
      { path: 'governance/evidence', component: EvidenceCenter, meta: { title: '证据资料中心', group: '规则与证据' } },
      { path: 'research/workbench', component: ResearchWorkbench, meta: { title: '科研工作台', group: '科研与知识' } },
      { path: 'knowledge/reviews', component: KnowledgeReviews, meta: { title: '知识审核中心', group: '科研与知识' } },
      { path: 'admin/integrations', component: IntegrationConsole, meta: { title: '接口与同步', group: '系统管理' } },
      { path: 'admin/audit', component: AuditLog, meta: { title: '审计日志', group: '系统管理' } },
      { path: 'developer/api-docs', component: ApiDocs, meta: { title: 'API 接口文档', group: '系统管理' } }
    ]},
    { path: '/workbench/:encounterId', redirect: to => `/doctor/workbench/${String(to.params.encounterId)}` },
    { path: '/:pathMatch(.*)*', redirect: '/doctor/worklist' }
  ]
})
