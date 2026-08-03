<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <aside class="app-sidebar" aria-label="主导航">
      <router-link class="shell-brand" to="/doctor/worklist">
        <span class="shell-brand-mark">H</span>
        <span><strong>HospitalAI</strong><small>院内药学辅助决策</small></span>
      </router-link>

      <div class="preview-boundary"><FlaskConical :size="15" /><span><strong>界面预览模式</strong><small>未连接医院生产数据</small></span></div>

      <nav class="shell-nav">
        <template v-for="group in visibleNavigation" :key="group.key">
          <button class="nav-group-label" type="button" @click="toggleGroup(group.key)">
            <span>{{ group.label }}</span><ChevronDown :size="14" :class="{ rotated: collapsedGroups.has(group.key) }" />
          </button>
          <div v-show="!collapsedGroups.has(group.key)" class="nav-group-items">
            <router-link v-for="item in group.items" :key="item.path" :to="item.path">
              <component :is="item.icon" :size="17" /><span>{{ item.label }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </router-link>
          </div>
        </template>
      </nav>

      <div class="sidebar-footer">
        <label for="role-view">角色视角</label>
        <el-select id="role-view" v-model="role" size="small" aria-label="切换角色视角">
          <el-option label="超级管理员（全视图）" value="super_admin" />
          <el-option label="临床医生" value="doctor" />
          <el-option label="临床药师" value="pharmacist" />
          <el-option label="科研负责人" value="researcher" />
          <el-option label="系统管理员" value="admin" />
        </el-select>
        <p><ShieldCheck :size="13" />角色切换不能绕过医疗硬规则</p>
      </div>
    </aside>

    <section class="shell-content">
      <header class="shell-topbar">
        <div class="route-context">
          <span>{{ currentGroup }}</span><ChevronRight :size="13" /><strong>{{ currentTitle }}</strong>
        </div>
        <div class="shell-search">
          <Search :size="16" /><input aria-label="全局搜索" placeholder="搜索患者、任务、规则或证据" />
          <kbd>Ctrl K</kbd>
        </div>
        <div class="shell-actions">
          <el-tooltip content="系统内待办" placement="bottom"><el-button :icon="Bell" circle aria-label="系统内待办" /><span class="notification-dot"></span></el-tooltip>
          <el-tooltip content="接口状态" placement="bottom"><el-button :icon="Activity" circle aria-label="接口状态" @click="$router.push('/admin/integrations')" /></el-tooltip>
          <div class="shell-user"><span>周</span><div><strong>周医生</strong><small>{{ roleLabel }}</small></div></div>
        </div>
      </header>

      <main id="main-content" class="app-main" :class="{ immersive: route.meta.immersive }">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Activity, Bell, BookOpenCheck, Braces, ChevronDown, ChevronRight, ClipboardCheck,
  FlaskConical, GitBranch, History, Library, ListTodo, Network, Search, ShieldCheck,
  Stethoscope, UsersRound
} from 'lucide-vue-next'

type Role = 'super_admin' | 'doctor' | 'pharmacist' | 'researcher' | 'admin'
const route = useRoute()
const role = ref<Role>('super_admin')
const collapsedGroups = ref(new Set<string>())

const navigation = [
  { key: 'doctor', label: '医生工作区', roles: ['super_admin', 'doctor'], items: [
    { label: '患者工作列表', path: '/doctor/worklist', icon: ListTodo, badge: '5' },
    { label: '处方辅助决策', path: '/doctor/workbench/E001', icon: Stethoscope },
    { label: '患者用药全景', path: '/doctor/patients/P001', icon: UsersRound },
    { label: '长期用药追踪', path: '/doctor/timeline/P001', icon: History }
  ]},
  { key: 'pharmacy', label: '药师工作区', roles: ['super_admin', 'pharmacist'], items: [
    { label: '风险复核队列', path: '/pharmacy/reviews', icon: ClipboardCheck, badge: '8' }
  ]},
  { key: 'governance', label: '规则与证据', roles: ['super_admin', 'pharmacist'], items: [
    { label: '临床规则管理', path: '/governance/rules', icon: GitBranch },
    { label: '证据资料中心', path: '/governance/evidence', icon: Library }
  ]},
  { key: 'research', label: '科研与知识', roles: ['super_admin', 'researcher', 'pharmacist'], items: [
    { label: '科研工作台', path: '/research/workbench', icon: FlaskConical },
    { label: '知识审核中心', path: '/knowledge/reviews', icon: BookOpenCheck, badge: '2' }
  ]},
  { key: 'admin', label: '系统管理', roles: ['super_admin', 'admin'], items: [
    { label: '接口与同步', path: '/admin/integrations', icon: Network },
    { label: '审计日志', path: '/admin/audit', icon: ShieldCheck },
    { label: 'API 接口文档', path: '/developer/api-docs', icon: Braces }
  ]}
]

const visibleNavigation = computed(() => navigation.filter(group => group.roles.includes(role.value)))
const currentTitle = computed(() => String(route.meta.title || '工作台'))
const currentGroup = computed(() => String(route.meta.group || 'HospitalAI'))
const roleLabel = computed(() => ({ super_admin: '超级管理员视角', doctor: '临床医生', pharmacist: '临床药师', researcher: '科研负责人', admin: '系统管理员' }[role.value]))

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  next.has(key) ? next.delete(key) : next.add(key)
  collapsedGroups.value = next
}
</script>
