<template>
  <div class="app-shell" :class="{ 'nav-collapsed': leftCollapsed }">
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
        <el-tooltip content="导入 JSON 验证场景" placement="bottom"><el-button :icon="FileJson2" circle aria-label="导入 JSON 验证场景" @click="flow.importDialogVisible = true" /></el-tooltip>
        <el-tooltip content="接口与同步状态" placement="bottom"><el-button :icon="Activity" circle aria-label="接口与同步状态" @click="$router.push('/admin/integrations')" /></el-tooltip>
        <div class="shell-user"><span>周</span><div><strong>周医生</strong><small>{{ roleLabel }}</small></div></div>
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
        <label class="scope-label" for="role-view">开发验证角色</label>
        <el-select id="role-view" v-model="role" size="small" aria-label="切换角色视图">
          <el-option label="超级管理员（全视图）" value="super_admin" /><el-option label="临床医生" value="doctor" /><el-option label="临床药师" value="pharmacist" /><el-option label="科研负责人" value="researcher" /><el-option label="系统管理员" value="admin" />
        </el-select>
        <div class="scope-section"><div class="scope-section-title"><span>当前科室</span><el-tag size="small">呼吸内科</el-tag></div><button class="scope-row selected"><span class="scope-avatar">呼</span><span><strong>呼吸内科</strong><small>CAP 住院队列</small></span><b>{{ flow.worklist.length || 0 }}</b></button></div>
        <div class="scope-section"><div class="scope-section-title"><span>{{ role === 'pharmacist' ? '待审核医嘱' : '负责患者' }}</span><span class="scope-count">{{ flow.worklist.length || 0 }}</span></div><button v-for="patient in flow.worklist.slice(0, 5)" :key="patient.encounterId" class="scope-row" @click="$router.push(role === 'pharmacist' ? '/pharmacy/reviews' : `/doctor/workbench/${patient.encounterId}`)"><span class="scope-avatar muted">{{ patient.displayName.slice(-1) }}</span><span><strong>{{ patient.displayName }}</strong><small>{{ patient.diagnosis }}</small></span><ChevronRight :size="14" /></button></div>
        <div class="scope-footnote"><FileJson2 :size="13" /> <span>{{ flow.currentScenarioLabel }} · 仅用于验证</span></div>
      </div>
      <div v-else class="collapsed-rail"><Building2 :size="17" /><span>工作范围</span><span class="rail-count">{{ flow.worklist.length || 0 }}</span></div>
    </aside>

    <main id="main-content" class="app-main" :class="{ immersive: route.meta.immersive }"><router-view /></main>
    <ScenarioImportDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Activity, BookOpenCheck, Building2, ClipboardCheck, ChevronRight, FileJson2, FlaskConical, GitBranch, Library, PanelLeftClose, PanelLeftOpen, ShieldCheck, Stethoscope, UsersRound } from 'lucide-vue-next'
import ScenarioImportDialog from '../components/ScenarioImportDialog.vue'
import { useFlowSimulationStore } from '../stores/flowSimulation'

type Role = 'super_admin' | 'doctor' | 'pharmacist' | 'researcher' | 'admin'
const route = useRoute()
const flow = useFlowSimulationStore()
const role = ref<Role>('super_admin')
const leftCollapsed = ref(false)
const navigation = [
  { label: '处方推荐', path: '/doctor/worklist', icon: Stethoscope, roles: ['super_admin', 'doctor'], badge: 'patients' },
  { label: '处方审核', path: '/pharmacy/reviews', icon: ClipboardCheck, roles: ['super_admin', 'pharmacist'], badge: 'reviews' },
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
onMounted(() => flow.ensureScenario())
</script>
