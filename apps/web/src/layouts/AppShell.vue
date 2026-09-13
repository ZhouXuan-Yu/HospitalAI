<template>
  <div class="app-shell" :class="{ 'nav-collapsed': leftCollapsed, 'immersive-shell': route.meta.immersive }">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="shell-topbar">
      <router-link class="shell-brand" to="/doctor/worklist" aria-label="HospitalAI 首页">
        <span class="shell-brand-mark">H</span>
        <span class="shell-brand-copy"><strong>HospitalAI</strong><small>临床药学决策工作台</small></span>
      </router-link>
      <nav class="primary-nav" aria-label="业务模块">
        <router-link v-for="item in visibleNavigation" :key="item.path" :to="item.path" class="primary-nav-item">
          <component :is="item.icon" :size="16" /><span>{{ item.label }}</span><b v-if="item.badge">{{ badgeValue(item.badge) }}</b>
        </router-link>
      </nav>
      <div class="shell-actions">
        <template v-if="isPreview">
          <span class="debug-data-status" :class="{ ready: flow.isReady }">{{ flow.isReady ? '模拟数据已载入' : '模拟数据已清除' }}</span>
          <el-tooltip content="载入内置模拟数据" placement="bottom"><el-button class="debug-data-button" :icon="Database" aria-label="载入内置模拟数据" @click="loadBuiltInScenario">载入数据</el-button></el-tooltip>
          <el-tooltip content="清除当前前端模拟数据" placement="bottom"><el-button class="debug-data-button" :icon="Trash2" aria-label="清除当前前端模拟数据" @click="clearSimulationData">清除数据</el-button></el-tooltip>
          <el-tooltip content="导入 JSON 验证场景" placement="bottom"><el-button :icon="FileJson2" circle aria-label="导入 JSON 验证场景" @click="flow.importDialogVisible = true" /></el-tooltip>
        </template>
        <el-tooltip content="接口与同步状态" placement="bottom"><el-button :icon="Activity" circle aria-label="接口与同步状态" @click="$router.push('/admin/integrations')" /></el-tooltip>
        <div class="shell-user"><span>{{ isPreview ? '周' : '用' }}</span><div><strong>{{ isPreview ? '周医生' : '当前用户' }}</strong><small>{{ isPreview ? roleLabel : '身份服务范围' }}</small></div></div>
      </div>
    </header>

    <aside class="app-sidebar" :aria-label="`${roleLabel}工作范围`">
      <div class="sidebar-tools">
        <button class="rail-toggle" type="button" :aria-label="leftCollapsed ? '展开工作范围' : '收起工作范围'" @click="leftCollapsed = !leftCollapsed">
          <PanelLeftClose v-if="!leftCollapsed" :size="16" /><PanelLeftOpen v-else :size="16" />
        </button>
        <span v-if="!leftCollapsed" class="scope-title">{{ scopeTitle }}</span>
      </div>
      <div v-if="!leftCollapsed" class="scope-body">
        <div class="scope-banner"><ShieldCheck :size="15" /><div><strong>{{ roleLabel }}</strong><span>{{ scopeDescription }}</span></div></div>
        <label v-if="isPreview" class="scope-label" for="role-view">开发验证角色</label>
        <el-select v-if="isPreview" id="role-view" v-model="role" size="small" aria-label="切换角色视图">
          <el-option label="超级管理员（全视图）" value="super_admin" /><el-option label="临床医生" value="doctor" /><el-option label="临床药师" value="pharmacist" /><el-option label="科研负责人" value="researcher" /><el-option label="系统管理员" value="admin" />
        </el-select>
        <template v-if="isPreview">
          <div class="scope-section"><div class="scope-section-title"><span>当前科室</span><el-tag size="small">呼吸内科</el-tag></div><button class="scope-row selected"><span class="scope-avatar">呼</span><span><strong>呼吸内科</strong><small>CAP 住院队列</small></span><b>{{ flow.worklist.length || 0 }}</b></button></div>
          <div class="scope-section"><div class="scope-section-title"><span>{{ role === 'pharmacist' ? '待审核医嘱' : '负责患者' }}</span><span class="scope-count">{{ flow.worklist.length || 0 }}</span></div><button v-for="patient in flow.worklist.slice(0, 5)" :key="patient.encounterId" class="scope-row" @click="$router.push(role === 'pharmacist' ? '/pharmacy/reviews' : `/doctor/workbench/${patient.encounterId}`)"><span class="scope-avatar muted">{{ patient.displayName.slice(-1) }}</span><span><strong>{{ patient.displayName }}</strong><small>{{ patient.diagnosis }}</small></span><ChevronRight :size="14" /></button></div>
        </template>
        <div v-else class="scope-empty"><Building2 :size="18" /><strong>等待授权范围</strong><span>正式科室、患者和任务列表由身份服务与 Core API 返回。</span></div>
        <div v-if="isPreview" class="scope-footnote"><FileJson2 :size="13" /> <span>{{ flow.currentScenarioLabel }} · 仅用于验证</span></div>
        <div v-else class="scope-footnote production-scope-note"><ShieldCheck :size="13" /> <span>工作范围由身份与科室权限决定</span></div>
      </div>
      <div v-else class="collapsed-rail"><Building2 :size="17" /><span>工作范围</span><span class="rail-count">{{ flow.worklist.length || 0 }}</span></div>
    </aside>

    <main id="main-content" class="app-main" :class="{ immersive: route.meta.immersive }"><router-view /></main>
    <ScenarioImportDialog v-if="isPreview" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { Activity, BookOpenCheck, Building2, ClipboardCheck, ChevronRight, Database, FileJson2, FilePlus2, FileText, FlaskConical, GitBranch, Library, PanelLeftClose, PanelLeftOpen, Send, ShieldCheck, Stethoscope, Trash2, UsersRound } from 'lucide-vue-next'
import ScenarioImportDialog from '../components/ScenarioImportDialog.vue'
import { useFlowSimulationStore } from '../stores/flowSimulation'

type Role = 'super_admin' | 'doctor' | 'pharmacist' | 'researcher' | 'admin'
const route = useRoute()
const flow = useFlowSimulationStore()
const isPreview = import.meta.env.VITE_UI_PREVIEW === 'true'
const role = ref<Role>('super_admin')
const leftCollapsed = ref(false)
const navigation = [
  { label: '处方推荐', path: '/doctor/worklist', icon: Stethoscope, roles: ['super_admin', 'doctor'], badge: 'patients' },
  { label: '处方审核', path: '/pharmacy/reviews', icon: ClipboardCheck, roles: ['super_admin', 'pharmacist'], badge: 'reviews' },
  { label: '处方点评', path: '/pharmacy/retrospective', icon: FileText, roles: ['super_admin', 'pharmacist'] },
  { label: '药历', path: '/pharmacy/records', icon: FilePlus2, roles: ['super_admin', 'pharmacist'] },
  { label: '用药教育', path: '/pharmacy/education', icon: Send, roles: ['super_admin', 'pharmacist'] },
  { label: '患者全景', path: '/doctor/patients/P001', icon: UsersRound, roles: ['super_admin', 'doctor'] },
  { label: '科研与知识', path: '/research/workbench', icon: FlaskConical, roles: ['super_admin', 'researcher', 'pharmacist'] },
  { label: '知识审核', path: '/knowledge/reviews', icon: BookOpenCheck, roles: ['super_admin', 'pharmacist'], badge: '2' }
  ,{ label: '规则管理', path: '/governance/rules', icon: GitBranch, roles: ['super_admin', 'pharmacist'] }
  ,{ label: '证据中心', path: '/governance/evidence', icon: Library, roles: ['super_admin', 'pharmacist'] }
  ,{ label: '审计日志', path: '/admin/audit', icon: ShieldCheck, roles: ['super_admin', 'admin'] }
]
const visibleNavigation = computed(() => navigation.filter(item => item.roles.includes(role.value)))
const roleLabel = computed(() => ({ super_admin: '超级管理员视图', doctor: '临床医生', pharmacist: '临床药师', researcher: '科研负责人', admin: '系统管理员' }[role.value]))
const scopeTitle = computed(() => role.value === 'pharmacist' ? '药师审核范围' : role.value === 'researcher' ? '科研数据范围' : '临床工作范围')
const scopeDescription = computed(() => role.value === 'pharmacist' ? '仅显示负责科室待审核医嘱' : role.value === 'researcher' ? '仅显示已脱敏研究数据' : '仅显示当前负责科室患者')
const badgeValue = (badge: string) => badge === 'patients' ? flow.worklist.length : badge === 'reviews' ? '待办' : badge
async function loadBuiltInScenario() {
  try {
    await flow.loadBundledScenario()
    ElMessage.success(`已载入内置模拟数据，共 ${flow.worklist.length} 个就诊场景`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '内置模拟数据载入失败')
  }
}
async function clearSimulationData() {
  try {
    await ElMessageBox.confirm('清除后，当前浏览器会话中的患者、审核、科研和审计验证状态都会被移除。', '清除前端模拟数据', { type: 'warning', confirmButtonText: '确认清除', cancelButtonText: '取消' })
    flow.clearScenario()
    ElMessage.success('前端模拟数据已清除，当前页面已进入空态')
  } catch {
    // 用户取消确认时保持当前流程不变。
  }
}
onMounted(() => {
  if (import.meta.env.VITE_UI_PREVIEW === 'true') void flow.ensureScenario()
})
</script>
