<template>
  <main class="workbench">
    <header class="topbar">
      <div>
        <div class="brand">HospitalAI 药学辅助工作台</div>
        <div class="meta">合成模拟数据；处方草稿回写不代表正式医嘱</div>
      </div>
      <div class="toolbar">
        <el-select v-model="encounterId" size="small" style="width: 260px" @change="load">
          <el-option
            v-for="item in store.worklist"
            :key="item.encounterId"
            :label="`${item.displayName} · ${item.department} · ${item.encounterId}`"
            :value="item.encounterId"
          />
        </el-select>
        <el-button :icon="RefreshCw" size="small" @click="load">刷新快照</el-button>
      </div>
    </header>

    <el-alert v-if="store.error" type="error" :title="store.error" :closable="false" />
    <div v-if="store.payload" class="workspace-grid" data-testid="doctor-workbench">
      <aside class="panel">
        <section class="section">
          <h2>患者主档</h2>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="患者">{{ store.payload.patient.displayName }}</el-descriptions-item>
            <el-descriptions-item label="内部ID">{{ store.payload.patient.patientId }}</el-descriptions-item>
            <el-descriptions-item label="HIS标识">{{ store.payload.patient.sourcePatientId }}</el-descriptions-item>
            <el-descriptions-item label="年龄/性别">{{ store.payload.patient.age }} / {{ store.payload.patient.sex }}</el-descriptions-item>
            <el-descriptions-item label="当前就诊">{{ store.payload.encounter.encounterId }} v{{ store.payload.encounter.dataVersion }}</el-descriptions-item>
            <el-descriptions-item label="科室">{{ store.payload.encounter.department }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="section">
          <h2>当前就诊与跨科室安全摘要</h2>
          <div class="quiet-list">
            <div v-for="fact in store.payload.facts" :key="fact.sourceId + fact.label" class="fact-row">
              <div class="fact-title">
                <span>{{ fact.label }}</span>
                <el-tag size="small" :type="fact.missingStatus === 'present' ? 'info' : 'warning'">{{ fact.missingStatus }}</el-tag>
              </div>
              <div>{{ fact.value }}</div>
              <div class="meta">{{ fact.source }} · {{ fact.sourceId }} · {{ formatTime(fact.collectedAt) }}</div>
            </div>
          </div>
        </section>
      </aside>

      <section class="panel center">
        <section class="section">
          <h2>阶段状态</h2>
          <div class="toolbar stage-toolbar">
            <el-tag v-for="stage in store.payload.stages" :key="stage.name" :type="stage.status === 'complete' ? 'success' : 'warning'">
              {{ stage.name }} · {{ stage.status }} · {{ stage.elapsedMs }}ms
            </el-tag>
          </div>
        </section>

        <section class="section">
          <h2>候选方案横向比较</h2>
          <table class="candidate-matrix" aria-label="候选方案横向比较">
            <thead>
              <tr>
                <th class="row-label">项目</th>
                <th v-for="candidate in store.payload.candidates" :key="candidate.candidateId">
                  <el-radio v-model="store.selectedCandidateId" :label="candidate.candidateId">
                    {{ candidate.name }}
                  </el-radio>
                  <el-tag v-if="candidate.blocked" size="small" type="danger">阻断</el-tag>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="row-label">药品组合</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">{{ candidate.regimen }}</td>
              </tr>
              <tr>
                <td class="row-label">推荐原因</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">{{ candidate.reason }}</td>
              </tr>
              <tr>
                <td class="row-label">主要差异</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">{{ candidate.difference }}</td>
              </tr>
              <tr>
                <td class="row-label">风险</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">
                  <div v-for="risk in candidate.risks" :key="risk">{{ risk }}</div>
                </td>
              </tr>
              <tr>
                <td class="row-label">监测项</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">{{ candidate.monitoring.join('、') }}</td>
              </tr>
              <tr>
                <td class="row-label">排除</td>
                <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId">
                  <span v-if="candidate.excludedDrugs.length">{{ candidate.excludedDrugs.join('；') }}</span>
                  <span v-else>无</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section decision">
          <h2>医生审核</h2>
          <el-input v-model="reason" placeholder="填写采纳、修改或驳回原因" />
          <el-input v-model="store.modifyText" type="textarea" :rows="3" placeholder="直接修改方案后提交；系统保存修改前后差异" />
          <div class="toolbar">
            <el-button :icon="CheckCircle2" type="primary" :disabled="selectedBlocked || store.hasBlockingRisk" @click="submit('adopt')">采纳并生成草稿</el-button>
            <el-button :icon="Pencil" :disabled="selectedBlocked || store.hasBlockingRisk" @click="submit('modify')">修改后生成草稿</el-button>
            <el-button :icon="XCircle" type="danger" plain @click="submit('reject')">驳回推荐</el-button>
          </div>
          <el-alert v-if="store.hasBlockingRisk" type="error" title="存在硬阻断风险，任何角色都不能绕过并生成处方草稿" :closable="false" />
          <el-alert v-if="store.decisionResult" type="success" :title="decisionSummary" :closable="false" />
        </section>
      </section>

      <aside class="panel right">
        <section class="section">
          <h2>阻断、提醒与缺失</h2>
          <div class="quiet-list">
            <div v-for="alert in store.payload.alerts" :key="alert.ruleId + alert.message" class="risk-row" :class="riskClass(alert.level)">
              <div class="risk-title">
                <span>{{ alert.ruleId }} · {{ alert.version }}</span>
                <el-tag size="small" :type="tagType(alert.level)">{{ alert.level }}</el-tag>
              </div>
              <div>{{ alert.message }}</div>
              <div class="meta">{{ alert.status }} · 命中事实 {{ alert.facts.join('、') }}</div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2>证据定位</h2>
          <div v-if="selectedCandidate?.evidence.length" class="quiet-list">
            <div v-for="item in selectedCandidate.evidence" :key="item.evidenceId" class="fact-row">
              <div class="fact-title">
                <span>{{ item.title }}</span>
                <el-tag size="small" type="warning">{{ item.status }}</el-tag>
              </div>
              <div>{{ item.text }}</div>
              <div class="meta">{{ item.version }} · {{ item.effectiveDate }} · {{ item.locator }} · score {{ item.score }}</div>
            </div>
          </div>
          <el-empty v-else description="证据不足或解释服务降级" />
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Pencil, RefreshCw, XCircle } from 'lucide-vue-next'
import { useWorkbenchStore } from '../stores/workbench'

const route = useRoute()
const router = useRouter()
const store = useWorkbenchStore()
const encounterId = ref(String(route.params.encounterId || 'E001'))
const reason = ref('已阅读风险与证据，仅生成 HIS 模拟处方草稿')

const selectedCandidate = computed(() => store.selectedCandidate)
const selectedBlocked = computed(() => Boolean(selectedCandidate.value?.blocked))
const decisionSummary = computed(() => {
  const result = store.decisionResult
  if (!result) return ''
  return `审核结果：${result.action}；草稿状态：${result.draftStatus || '无'}；草稿ID：${result.prescriptionDraftId || '未生成'}`
})

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function riskClass(level: string) {
  return level === 'block' ? 'block-risk' : level === 'strong' ? 'strong-risk' : 'info-risk'
}

function tagType(level: string) {
  return level === 'block' ? 'danger' : level === 'strong' ? 'warning' : 'info'
}

async function load() {
  await router.replace(`/workbench/${encounterId.value}`)
  await store.load(encounterId.value)
}

async function submit(action: 'adopt' | 'modify' | 'reject') {
  await store.decide(action, reason.value)
}

watch(() => store.selectedCandidateId, () => {
  if (store.selectedCandidate) {
    store.modifyText = store.selectedCandidate.regimen
  }
})

onMounted(async () => {
  await store.loadWorklist()
  if (!store.worklist.some(item => item.encounterId === encounterId.value)) {
    encounterId.value = store.worklist[0]?.encounterId ?? encounterId.value
  }
  await load()
})
</script>
