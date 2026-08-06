<template>
  <main class="workbench" :aria-busy="store.loading">
    <header class="topbar">
      <div class="brand-lockup" aria-label="HospitalAI 药学辅助工作台">
        <div class="brand-mark" aria-hidden="true">H</div>
        <div>
          <div class="brand">HospitalAI <span>药学辅助工作台</span></div>
          <div class="product-boundary">辅助决策 · 仅生成处方草稿</div>
        </div>
      </div>

      <div class="encounter-switcher">
        <span class="switcher-label">当前患者</span>
        <el-select
          v-model="encounterId"
          aria-label="切换当前患者"
          filterable
          size="default"
          @change="load"
        >
          <el-option
            v-for="item in store.worklist"
            :key="item.encounterId"
            :label="`${item.displayName} · ${item.department} · ${item.encounterId}`"
            :value="item.encounterId"
          />
        </el-select>
      </div>

      <div class="header-actions">
        <el-tooltip content="刷新患者快照" placement="bottom">
          <el-button :icon="RefreshCw" circle aria-label="刷新患者快照" :loading="store.loading" @click="load" />
        </el-tooltip>
        <el-button class="compact-risk-trigger" :icon="ShieldAlert" @click="rightDrawerVisible = true">
          安全审查
          <span v-if="unresolvedAlertCount" class="button-count">{{ unresolvedAlertCount }}</span>
        </el-button>
        <div class="role-identity" aria-label="当前角色：医生">
          <div class="role-avatar">医</div>
          <div>
            <strong>开发医生</strong>
            <span>呼吸内科</span>
          </div>
          <ChevronDown :size="15" aria-hidden="true" />
        </div>
      </div>
    </header>

    <el-alert v-if="store.error" class="global-alert" type="error" :title="store.error" :closable="false" show-icon />

    <div v-if="store.loading && !store.payload" class="initial-loading" aria-label="正在加载患者工作台">
      <el-skeleton :rows="10" animated />
    </div>

    <div
      v-if="store.payload"
      class="workspace-grid"
      :class="{ 'left-collapsed': leftCollapsed, 'right-collapsed': rightCollapsed }"
      data-testid="doctor-workbench"
    >
      <aside class="panel patient-panel" aria-label="患者上下文">
        <button class="collapsed-rail patient-rail" type="button" @click="leftCollapsed = false">
          <Stethoscope :size="18" />
          <strong>患者输入</strong>
          <span>{{ store.payload.patient.displayName }}</span>
        </button>
        <div v-show="!leftCollapsed" class="panel-body">
        <section class="patient-identity">
          <div class="patient-heading">
            <div class="patient-avatar" aria-hidden="true">{{ patientInitial }}</div>
            <div class="patient-title">
              <div class="patient-name-line">
                <h1>{{ store.payload.patient.displayName }}</h1>
                <el-tag size="small" effect="plain">合成数据</el-tag>
              </div>
              <p>{{ sexLabel }} · {{ store.payload.patient.age }} 岁 · {{ store.payload.encounter.department }}</p>
            </div>
          </div>
          <div class="identity-grid">
            <div><span>住院号</span><strong>{{ store.payload.patient.sourcePatientId }}</strong></div>
            <div><span>当前就诊</span><strong>{{ store.payload.encounter.encounterId }}</strong></div>
            <div><span>数据版本</span><strong>v{{ store.payload.encounter.dataVersion }}</strong></div>
            <div><span>内部患者</span><strong>{{ store.payload.patient.patientId }}</strong></div>
          </div>
          <div class="patient-summary-card">
            <span>主诉 / 当前问题</span>
            <strong>{{ chiefComplaintSummary }}</strong>
            <small>{{ safetySummaryLine }}</small>
          </div>
          <el-button class="collapse-panel-button" text size="small" @click="leftCollapsed = true">收起患者信息</el-button>
        </section>

        <section class="safety-summary" aria-labelledby="safety-summary-title">
          <div class="section-title-row">
            <h2 id="safety-summary-title">处方前安全摘要</h2>
            <span class="source-status"><span class="status-dot"></span>快照已同步</span>
          </div>
          <div class="safety-metrics">
            <button class="safety-metric danger" type="button" @click="openRightPanel('risks')">
              <ShieldX :size="17" aria-hidden="true" />
              <span><strong>{{ blockingAlerts.length }}</strong> 硬阻断</span>
            </button>
            <button class="safety-metric warning" type="button" @click="openRightPanel('risks')">
              <TriangleAlert :size="17" aria-hidden="true" />
              <span><strong>{{ strongAlerts.length }}</strong> 强提醒</span>
            </button>
            <button class="safety-metric neutral" type="button" @click="openRightPanel('quality')">
              <CircleHelp :size="17" aria-hidden="true" />
              <span><strong>{{ missingItems.length }}</strong> 待补信息</span>
            </button>
          </div>
          <div v-if="blockingAlerts.length" class="inherited-risk">
            <LockKeyhole :size="16" aria-hidden="true" />
            <span>{{ blockingAlerts[0].message }}</span>
          </div>
          <p v-else class="no-blocking-copy"><CircleCheck :size="16" /> 当前未命中硬阻断，仍需医生核对完整上下文</p>
        </section>

        <el-tabs v-model="patientTab" class="clinical-tabs" stretch>
          <el-tab-pane label="本次决策" name="current">
            <section class="context-section">
              <div class="section-title-row">
                <h2>当前诊断</h2>
                <el-tag size="small" type="success" effect="plain">有效</el-tag>
              </div>
              <div class="diagnosis-line">
                <Stethoscope :size="18" aria-hidden="true" />
                <div>
                  <strong>{{ store.payload.encounter.diagnosis }}</strong>
                  <span>来源 HIS · 当前住院周期</span>
                </div>
              </div>
            </section>

            <details v-for="group in currentFactGroups" :key="group.key" class="context-section fold-section">
              <summary>
                <span>{{ group.title }}</span>
                <small>{{ group.items[0]?.label }} · {{ group.items.length }} 项</small>
              </summary>
              <div class="fact-list">
                <article v-for="fact in group.items" :key="fact.sourceId + fact.label" class="clinical-fact">
                  <div class="fact-icon" :class="fact.missingStatus !== 'present' ? 'is-missing' : ''">
                    <component :is="factIcon(fact.type)" :size="16" aria-hidden="true" />
                  </div>
                  <div class="fact-content">
                    <div class="fact-label-row">
                      <span>{{ fact.label }}</span>
                      <el-tag v-if="fact.missingStatus !== 'present'" size="small" type="warning" effect="plain">待确认</el-tag>
                    </div>
                    <strong>{{ fact.value }}</strong>
                    <button class="source-link" type="button" @click="showSource(fact)">
                      {{ fact.source }} · {{ formatCompactTime(fact.collectedAt) }}
                      <ExternalLink :size="12" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              </div>
            </details>

            <section v-if="dataQualityAlerts.length" class="context-section data-quality-context">
              <div class="section-title-row">
                <h2>缺失、冲突与待确认</h2>
                <el-tag size="small" type="warning" effect="plain">不可按正常值处理</el-tag>
              </div>
              <div class="data-quality-alerts">
                <button v-for="alert in dataQualityAlerts" :key="alert.ruleId + alert.message" type="button" @click="openRightPanel('quality')">
                  <CircleHelp :size="15" aria-hidden="true" />
                  <span>{{ alert.message }}</span>
                  <ChevronRight :size="14" aria-hidden="true" />
                </button>
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane label="跨就诊安全" name="history">
            <section class="context-section history-context">
              <div class="section-title-row">
                <h2>统一用药安全摘要</h2>
                <span>跨科室 · 跨就诊</span>
              </div>
              <div v-if="historicalFacts.length" class="fact-list">
                <article v-for="fact in historicalFacts" :key="fact.sourceId + fact.label" class="clinical-fact">
                  <div class="fact-icon"><History :size="16" /></div>
                  <div class="fact-content">
                    <div class="fact-label-row"><span>{{ fact.label }}</span></div>
                    <strong>{{ fact.value }}</strong>
                    <button class="source-link" type="button" @click="showSource(fact)">
                      {{ fact.source }} · {{ formatCompactTime(fact.collectedAt) }}
                      <ExternalLink :size="12" />
                    </button>
                  </div>
                </article>
              </div>
              <el-empty v-else :image-size="52" description="当前快照未返回跨就诊事实" />
            </section>
          </el-tab-pane>
        </el-tabs>
        </div>
      </aside>

      <section class="panel recommendation-panel" aria-label="候选方案与医生审核">
        <div class="recommendation-heading">
          <div>
            <div class="eyebrow">处方前辅助决策</div>
            <h2>DeepSeek 处方推荐结果</h2>
            <p>{{ store.payload.encounter.diagnosis }} · {{ store.payload.recommendationId }}</p>
          </div>
          <div class="recommendation-heading-actions">
            <el-button :icon="RefreshCw" :loading="store.loading" @click="load">生成/刷新推荐</el-button>
            <el-button :icon="Stethoscope" @click="loadSimulatedPatient">模拟患者</el-button>
            <div class="recommendation-state" :class="store.aiDegraded ? 'degraded' : ''">
              <Bot :size="16" aria-hidden="true" />
              <span>{{ store.aiDegraded ? '解释服务降级' : 'DeepSeek 流程完成' }}</span>
            </div>
          </div>
        </div>

        <section class="core-result-card" :class="{ loading: store.loading || store.decisionLoading, blocked: selectedBlocked || store.hasBlockingRisk }">
          <div class="core-result-main">
            <span class="selection-kicker">核心推荐</span>
            <h3>{{ selectedCandidate?.name || '等待候选方案' }}</h3>
            <p>{{ selectedCandidate?.regimen || '输入或选择模拟患者后生成推荐结果。' }}</p>
          </div>
          <div class="core-result-side">
            <el-tag v-if="selectedBlocked || store.hasBlockingRisk" type="danger" effect="dark">硬阻断</el-tag>
            <el-tag v-else-if="selectedCandidate?.risks.length" type="warning" effect="plain">需复核</el-tag>
            <el-tag v-else type="success" effect="plain">可进入医生审核</el-tag>
            <span>{{ selectedCandidate?.reason || '推荐依据会在结果生成后显示。' }}</span>
          </div>
          <div class="core-monitoring">
            <span v-for="item in selectedCandidate?.monitoring || []" :key="item">{{ item }}</span>
          </div>
        </section>

        <section class="candidate-strip" aria-label="候选方案快速选择">
          <button
            v-for="candidate in store.payload.candidates"
            :key="candidate.candidateId"
            type="button"
            :class="{ selected: candidate.candidateId === store.selectedCandidateId, blocked: candidate.blocked }"
            @click="selectCandidate(candidate.candidateId)"
          >
            <strong>{{ candidate.name }}</strong>
            <span>{{ candidate.regimen }}</span>
          </button>
        </section>

        <details class="reasoning-details">
          <summary>
            <span>推理依据与流程阶段</span>
            <small>默认收起，展开查看完整决策链</small>
          </summary>
        <section class="decision-chain" aria-label="完整决策链">
          <article v-for="item in decisionChain" :key="item.key" :class="item.status">
            <div class="stage-marker">
              <component :is="item.status === 'complete' ? CircleCheck : item.status === 'degraded' ? CircleAlert : LoaderCircle" :size="16" />
            </div>
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.summary }}</span>
              <small>{{ item.detail }}</small>
              <dl class="chain-proof">
                <div>
                  <dt>关键输入</dt>
                  <dd>{{ item.inputs }}</dd>
                </div>
                <div>
                  <dt>处理逻辑</dt>
                  <dd>{{ item.logic }}</dd>
                </div>
                <div>
                  <dt>输出结果</dt>
                  <dd>{{ item.output }}</dd>
                </div>
              </dl>
            </div>
          </article>
        </section>
        </details>

        <el-alert
          v-if="store.aiDegraded"
          class="degraded-banner"
          type="warning"
          title="AI 解释服务不可用，已保留患者事实、硬规则与候选安全状态；证据不足处不会补写理由。"
          :closable="false"
          show-icon
        />

        <details class="reasoning-details comparison-details" open>
          <summary>
            <span>候选方案横向对比</span>
            <small>{{ store.payload.candidates.length }} 个目录内候选</small>
          </summary>
        <section class="matrix-section" aria-labelledby="candidate-matrix-title">
          <div class="section-title-row matrix-title-row">
            <div>
              <h2 id="candidate-matrix-title">方案横向对比</h2>
              <span>选择一列后进行采纳、修改或驳回</span>
            </div>
            <el-tag size="small" effect="plain">{{ store.payload.candidates.length }} 个目录内候选</el-tag>
          </div>

          <div class="matrix-scroll">
            <table class="candidate-matrix" aria-label="候选方案横向比较">
              <thead>
                <tr>
                  <th class="row-label">比较项目</th>
                  <th
                    v-for="candidate in store.payload.candidates"
                    :key="candidate.candidateId"
                    :class="{ selected: candidate.candidateId === store.selectedCandidateId, blocked: candidate.blocked }"
                  >
                    <button class="candidate-selector" type="button" @click="selectCandidate(candidate.candidateId)">
                      <span class="radio-indicator" aria-hidden="true"></span>
                      <span class="candidate-name">
                        <strong>{{ candidate.name }}</strong>
                        <small>{{ candidate.candidateId }}</small>
                      </span>
                      <el-tag v-if="candidate.blocked" size="small" type="danger" effect="dark">硬阻断</el-tag>
                      <el-tag v-else-if="candidate.risks.length" size="small" type="warning" effect="plain">需复核</el-tag>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-label"><Pill :size="15" />药品组合</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">
                    <strong class="regimen-text">{{ candidate.regimen }}</strong>
                  </td>
                </tr>
                <tr>
                  <td class="row-label"><BadgeCheck :size="15" />适用理由</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">{{ candidate.reason }}</td>
                </tr>
                <tr>
                  <td class="row-label"><GitCompareArrows :size="15" />同类差异</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">{{ candidate.difference }}</td>
                </tr>
                <tr>
                  <td class="row-label"><TriangleAlert :size="15" />主要风险</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">
                    <ul v-if="candidate.risks.length" class="cell-list risk-list">
                      <li v-for="risk in candidate.risks" :key="risk">{{ risk }}</li>
                    </ul>
                    <span v-else class="quiet-value">当前未返回特异风险</span>
                  </td>
                </tr>
                <tr>
                  <td class="row-label"><Activity :size="15" />监测要求</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">
                    <div class="monitoring-tags">
                      <span v-for="item in candidate.monitoring" :key="item">{{ item }}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="row-label"><BookOpenCheck :size="15" />证据状态</td>
                  <td v-for="candidate in store.payload.candidates" :key="candidate.candidateId" :class="cellClass(candidate)">
                    <button v-if="candidate.evidence.length" class="evidence-link" type="button" @click="openCandidateEvidence(candidate)">
                      {{ candidate.evidence.length }} 条受控证据 <ArrowUpRight :size="13" />
                    </button>
                    <span v-else class="insufficient-evidence"><CircleAlert :size="14" />证据不足</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        </details>

        <details class="reasoning-details drug-combo-details">
          <summary>
            <span>当前推荐药品组合说明</span>
            <small>{{ selectedDrugGuides.length }} 种药品 · 默认收起供核对</small>
          </summary>
          <section class="drug-combo-section" aria-label="当前推荐药品组合说明">
            <div class="drug-combo-overview">
              <div>
                <span class="selection-kicker">组合摘要</span>
                <strong>{{ selectedCandidate?.regimen || '尚未选择推荐方案' }}</strong>
                <small>{{ selectedDrugSourceLine }}</small>
              </div>
              <el-tag size="small" effect="plain">仅供医生核对</el-tag>
            </div>

            <div class="drug-guide-list">
              <details v-for="drug in selectedDrugGuides" :key="drug.code" class="drug-guide-item">
                <summary>
                  <span><Pill :size="15" />{{ drug.name }}</span>
                  <small>{{ drug.role }}</small>
                </summary>
                <dl class="drug-guide-grid">
                  <div><dt>核心作用</dt><dd>{{ drug.role }}</dd></div>
                  <div><dt>适应症</dt><dd>{{ drug.indication }}</dd></div>
                  <div><dt>用法用量</dt><dd>{{ drug.dosage }}</dd></div>
                  <div><dt>相互作用</dt><dd>{{ drug.interactions }}</dd></div>
                  <div><dt>常见不良反应</dt><dd>{{ drug.adverseReactions }}</dd></div>
                  <div><dt>注意事项</dt><dd>{{ drug.precautions }}</dd></div>
                  <div class="drug-guide-source"><dt>权威资料出处</dt><dd>{{ drug.sources }}</dd></div>
                </dl>
              </details>
            </div>
          </section>
        </details>

        <section class="decision-dock" aria-labelledby="decision-title">
          <div class="decision-summary">
            <span class="selection-kicker">当前选择</span>
            <strong>{{ selectedCandidate?.name || '尚未选择方案' }}</strong>
            <span>{{ selectedCandidate?.regimen || '请先在上方选择候选方案' }}</span>
          </div>

          <div v-if="!decisionMode" class="decision-actions">
            <el-button
              :icon="CheckCircle2"
              type="primary"
              :disabled="selectedBlocked || store.hasBlockingRisk || !selectedCandidate"
              :loading="store.decisionLoading"
              @click="submit('adopt')"
            >采纳并生成草稿</el-button>
            <el-button :icon="Pencil" :disabled="selectedBlocked || store.hasBlockingRisk || !selectedCandidate" @click="startDecision('modify')">修改方案</el-button>
            <el-button :icon="XCircle" plain @click="startDecision('reject')">驳回推荐</el-button>
          </div>

          <div v-else class="decision-editor">
            <div class="editor-heading">
              <div>
                <strong>{{ decisionMode === 'modify' ? '修改当前方案' : '驳回当前推荐' }}</strong>
                <span>{{ decisionMode === 'modify' ? '修改内容与原方案差异将进入审计记录' : '驳回不会生成处方草稿' }}</span>
              </div>
              <el-button :icon="X" circle text aria-label="关闭审核编辑" @click="decisionMode = null" />
            </div>

            <div v-if="decisionMode === 'modify'" class="regimen-diff">
              <div>
                <span>修改前</span>
                <p>{{ selectedCandidate?.regimen }}</p>
              </div>
              <ArrowRight :size="18" aria-hidden="true" />
              <div class="after-value">
                <label for="modified-regimen">修改后</label>
                <el-input id="modified-regimen" v-model="store.modifyText" type="textarea" :rows="2" resize="none" />
              </div>
            </div>

            <label class="reason-field">
              <span>处理原因 <em>必填</em></span>
              <el-input v-model="reason" :placeholder="decisionMode === 'modify' ? '说明修改依据与风险处理方式' : '说明驳回原因'" />
            </label>

            <div class="editor-actions">
              <el-button @click="decisionMode = null">取消</el-button>
              <el-button
                :type="decisionMode === 'reject' ? 'danger' : 'primary'"
                :icon="decisionMode === 'reject' ? XCircle : Save"
                :disabled="!reason.trim() || (decisionMode === 'modify' && !store.modifyText.trim())"
                :loading="store.decisionLoading"
                @click="submit(decisionMode)"
              >{{ decisionMode === 'modify' ? '确认修改并生成草稿' : '确认驳回推荐' }}</el-button>
            </div>
          </div>

          <div v-if="store.hasBlockingRisk" class="blocking-lock" role="alert">
            <ShieldX :size="18" aria-hidden="true" />
            <div><strong>硬阻断已锁定草稿操作</strong><span>任何角色均不能绕过。可驳回推荐或返回患者事实处理风险。</span></div>
            <el-button size="small" type="danger" plain @click="openRightPanel('risks')">查看阻断</el-button>
          </div>
          <div v-if="store.decisionResult" class="decision-receipt" role="status">
            <CircleCheck :size="20" aria-hidden="true" />
            <div><strong>{{ decisionReceiptTitle }}</strong><span>{{ decisionSummary }}</span></div>
            <el-tag size="small" type="success">已审计</el-tag>
          </div>
        </section>

        <section v-if="flowDecision" class="prescription-lifecycle" data-testid="prescription-lifecycle" aria-labelledby="lifecycle-title">
          <header>
            <div><span class="selection-kicker">处方后闭环</span><h2 id="lifecycle-title">草稿回写与结局记录</h2><p>{{ flowDecision.draftId || '推荐已驳回，不生成处方草稿' }}</p></div>
            <el-tag :type="flowDecision.action==='reject'?'info':flowOutcome?'success':'warning'" effect="plain">{{ lifecycleStatusLabel }}</el-tag>
          </header>
          <template v-if="flowDecision.action!=='reject'">
            <nav class="lifecycle-steps" aria-label="处方草稿流程">
              <div v-for="(step,index) in draftSteps" :key="step.key" :class="{done:index<=currentDraftIndex,active:index===currentDraftIndex}"><span><CircleCheck v-if="index<=currentDraftIndex" :size="14"/><span v-else>{{ index+1 }}</span></span><div><strong>{{ step.label }}</strong><small>{{ step.meta }}</small></div><ChevronRight v-if="index<draftSteps.length-1" :size="14"/></div>
            </nav>
            <div class="lifecycle-actions">
              <div><strong>下一业务动作</strong><span>{{ nextLifecycleHint }}</span></div>
              <el-alert v-if="flowActionError" type="error" :title="flowActionError" :closable="false"/>
              <el-button v-if="currentDraftIndex<draftSteps.length-1" type="primary" :icon="Send" @click="advanceDraft">{{ nextDraftActionLabel }}</el-button>
              <el-button v-else-if="!flowOutcome" type="primary" :icon="ClipboardPlus" @click="openOutcomeDialog">登记实际用药与出院结局</el-button>
              <el-button v-else type="success" :icon="FlaskConical" @click="router.push('/research/workbench')">进入科研队列流程</el-button>
            </div>
            <div v-if="flowOutcome" class="outcome-receipt"><CircleCheck :size="17"/><div><strong>结局已结构化并进入科研候选池</strong><span>{{ responseLabel(flowOutcome.treatmentResponse) }} · 不良事件 {{ flowOutcome.adverseEvent?'有':'无' }} · 30天随访 {{ flowOutcome.followupComplete?'完整':'缺失' }}</span></div><code>LIVE-{{ encounterId }}</code></div>
          </template>
          <div v-else class="rejection-boundary"><Ban :size="17"/><span>驳回已写入前端审计链，流程在医生决策阶段结束。</span></div>
        </section>
      </section>

      <button v-if="rightDrawerVisible" class="drawer-backdrop" type="button" aria-label="关闭安全审查" @click="rightDrawerVisible = false"></button>
      <aside class="panel safety-panel" :class="{ 'drawer-open': rightDrawerVisible }" aria-label="风险与证据">
        <button class="collapsed-rail safety-rail" type="button" @click="rightCollapsed = false">
          <ShieldAlert :size="18" />
          <strong>参考记录</strong>
          <span>{{ unresolvedAlertCount }} 项风险</span>
        </button>
        <div v-show="!rightCollapsed" class="panel-body">
        <div class="safety-panel-header">
          <div>
            <div class="eyebrow">处方前安全审查</div>
            <h2>风险与证据</h2>
          </div>
          <div class="side-panel-actions">
            <el-button class="drawer-close" :icon="X" circle text aria-label="关闭安全审查" @click="rightDrawerVisible = false" />
            <el-button :icon="ChevronRight" circle text aria-label="收起参考记录" @click="rightCollapsed = true" />
          </div>
        </div>

        <div class="risk-overview">
          <div class="risk-score" :class="blockingAlerts.length ? 'danger' : strongAlerts.length ? 'warning' : 'clear'">
            <ShieldAlert :size="22" aria-hidden="true" />
            <div>
              <strong>{{ blockingAlerts.length ? '存在硬阻断' : strongAlerts.length ? '需要重点复核' : '未发现硬阻断' }}</strong>
              <span>{{ unresolvedAlertCount }} 项规则结果 · {{ store.payload.alerts.length }} 项总提醒</span>
            </div>
          </div>
        </div>

        <el-tabs v-model="rightTab" class="clinical-tabs safety-tabs" stretch>
          <el-tab-pane name="risks">
            <template #label><ShieldAlert :size="15" />规则风险</template>
            <section class="right-section">
              <div v-if="sortedAlerts.length" class="risk-list-stack">
                <article v-for="alert in sortedAlerts" :key="alert.ruleId + alert.message" class="risk-item" :class="riskClass(alert.level)">
                  <div class="risk-item-heading">
                    <div class="risk-level-label">
                      <component :is="riskIcon(alert.level)" :size="17" aria-hidden="true" />
                      <strong>{{ riskLabel(alert.level) }}</strong>
                    </div>
                    <span>{{ alert.ruleId }} · v{{ alert.version }}</span>
                  </div>
                  <p>{{ alert.message }}</p>
                  <div class="risk-facts">
                    <span>命中事实</span>
                    <button v-for="fact in alert.facts" :key="fact" type="button">{{ fact }}</button>
                  </div>
                  <div class="rule-state"><LockKeyhole v-if="alert.blocking" :size="13" />{{ alert.status }}{{ alert.blocking ? ' · 不可绕过' : ' · 需记录处理结果' }}</div>
                </article>
              </div>
              <el-empty v-else :image-size="58" description="当前未命中规则提醒" />
            </section>
          </el-tab-pane>

          <el-tab-pane name="evidence">
            <template #label><Library :size="15" />证据</template>
            <section class="right-section">
              <div class="evidence-status-row">
                <span><span class="status-dot"></span>{{ selectedEvidence.length }} 条检索结果</span>
                <el-tag size="small" :type="store.aiDegraded ? 'warning' : 'success'" effect="plain">{{ store.aiDegraded ? '解释降级' : '受控检索' }}</el-tag>
              </div>
              <div v-if="selectedEvidence.length" class="evidence-stack">
                <article v-for="item in selectedEvidence" :key="item.evidenceId" class="evidence-item">
                  <div class="evidence-heading">
                    <span>{{ evidenceStatusLabel(item.status) }}</span>
                    <small>相关度 {{ Math.round(item.score * 100) }}%</small>
                  </div>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.text }}</p>
                  <div class="evidence-meta">
                    <span><FileText :size="13" />{{ item.version }}</span>
                    <span><MapPin :size="13" />{{ item.locator }}</span>
                    <span><CalendarClock :size="13" />{{ item.effectiveDate }}</span>
                  </div>
                  <el-button :icon="ScanSearch" size="small" @click="showEvidence(item)">查看原文定位</el-button>
                </article>
              </div>
              <div v-else class="evidence-empty">
                <CircleAlert :size="22" />
                <strong>证据不足</strong>
                <p>当前候选未返回可定位证据，系统不会补写医学理由。</p>
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane name="quality">
            <template #label><ListChecks :size="15" />排除与缺失</template>
            <section class="right-section">
              <div class="right-subheading"><h3>排除药物及原因</h3><span>{{ selectedCandidate?.excludedDrugs.length || 0 }} 项</span></div>
              <div v-if="selectedCandidate?.excludedDrugs.length" class="exclusion-list">
                <div v-for="item in selectedCandidate.excludedDrugs" :key="item"><Ban :size="16" />{{ item }}</div>
              </div>
              <p v-else class="quiet-empty">当前方案未返回排除药物。</p>

              <div class="right-subheading quality-heading"><h3>缺失与待确认数据</h3><span>{{ missingItems.length }} 项</span></div>
              <div v-if="missingItems.length" class="quality-list">
                <div v-for="item in missingItems" :key="item">
                  <CircleHelp :size="16" />
                  <div><strong>未知值不可按正常处理</strong><span>{{ item }}</span></div>
                </div>
              </div>
              <p v-else class="quiet-empty">当前未返回关键缺失信息。</p>
            </section>
          </el-tab-pane>
        </el-tabs>
        </div>
      </aside>
    </div>

    <el-drawer v-model="evidenceDrawerVisible" title="证据原文定位" size="520px" append-to-body>
      <div v-if="activeEvidence" class="evidence-drawer-content">
        <div class="drawer-document-meta">
          <el-tag type="warning" effect="plain">{{ evidenceStatusLabel(activeEvidence.status) }}</el-tag>
          <span>{{ activeEvidence.evidenceId }}</span>
        </div>
        <h2>{{ activeEvidence.title }}</h2>
        <dl>
          <div><dt>文档版本</dt><dd>{{ activeEvidence.version }}</dd></div>
          <div><dt>生效日期</dt><dd>{{ activeEvidence.effectiveDate }}</dd></div>
          <div><dt>原文定位</dt><dd>{{ activeEvidence.locator }}</dd></div>
          <div><dt>检索得分</dt><dd>{{ activeEvidence.score.toFixed(2) }}</dd></div>
        </dl>
        <div class="source-excerpt">
          <div class="source-excerpt-label"><ScanSearch :size="15" />命中片段</div>
          <p>{{ activeEvidence.text }}</p>
        </div>
        <el-alert type="info" title="当前演示证据仅展示受控片段与定位信息；原始 PDF 页面查看器待文档附件接口接入后启用。" :closable="false" show-icon />
      </div>
    </el-drawer>

    <el-drawer v-model="sourceDrawerVisible" title="原始事实记录" size="440px" append-to-body>
      <div v-if="activeFact" class="source-record">
        <div class="source-record-value"><span>{{ activeFact.label }}</span><strong>{{ activeFact.value }}</strong></div>
        <dl>
          <div><dt>来源系统</dt><dd>{{ activeFact.source }}</dd></div>
          <div><dt>来源标识</dt><dd>{{ activeFact.sourceId }}</dd></div>
          <div><dt>采集时间</dt><dd>{{ formatTime(activeFact.collectedAt) }}</dd></div>
          <div><dt>缺失状态</dt><dd>{{ activeFact.missingStatus }}</dd></div>
        </dl>
        <el-alert type="info" title="AI 摘要不会覆盖此原始事实。" :closable="false" show-icon />
      </div>
    </el-drawer>

    <el-dialog v-model="outcomeDialogVisible" title="登记实际用药与出院结局" width="560px" append-to-body :close-on-click-modal="false">
      <el-alert type="warning" title="此记录来自前端流程模拟，将作为科研队列候选记录；未知值必须显式选择，不能按正常处理。" :closable="false" show-icon/>
      <el-form class="outcome-form" label-position="top">
        <el-form-item label="实际执行用药方案"><el-input v-model="outcomeForm.actualRegimen" type="textarea" :rows="2"/></el-form-item>
        <el-form-item label="院内治疗反应"><el-select v-model="outcomeForm.treatmentResponse" aria-label="院内治疗反应"><el-option label="改善" value="improved"/><el-option label="稳定" value="stable"/><el-option label="恶化" value="worsened"/><el-option label="未知 / 待随访" value="unknown"/></el-select></el-form-item>
        <div class="outcome-switches"><label><span>住院期间不良事件</span><el-switch v-model="outcomeForm.adverseEvent"/></label><label><span>30天随访已完整</span><el-switch v-model="outcomeForm.followupComplete"/></label></div>
      </el-form>
      <template #footer><el-button @click="outcomeDialogVisible=false">取消</el-button><el-button type="primary" :disabled="!outcomeForm.actualRegimen.trim()" @click="saveOutcome">保存并进入科研候选池</el-button></template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  BookOpenCheck,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ExternalLink,
  FileText,
  FlaskConical,
  GitCompareArrows,
  HeartPulse,
  History,
  Library,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Microscope,
  Pencil,
  Pill,
  RefreshCw,
  Save,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Send,
  Stethoscope,
  TriangleAlert,
  X,
  XCircle,
  ClipboardPlus
} from 'lucide-vue-next'
import type { CandidatePlan, EvidenceSnippet, Fact, SafetyAlert, StageState } from '../services/coreApi'
import { useWorkbenchStore } from '../stores/workbench'
import { useFlowSimulationStore } from '../stores/flowSimulation'
import type { OutcomeRecord } from '../types/flowScenario'

const route = useRoute()
const router = useRouter()
const store = useWorkbenchStore()
const flow = useFlowSimulationStore()
const encounterId = ref(String(route.params.encounterId || 'E001'))
const reason = ref('已核对患者事实、规则风险与证据，仅生成 HIS 处方草稿')
const patientTab = ref('current')
const rightTab = ref('risks')
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const rightDrawerVisible = ref(false)
const evidenceDrawerVisible = ref(false)
const sourceDrawerVisible = ref(false)
const activeEvidence = ref<EvidenceSnippet | null>(null)
const activeFact = ref<Fact | null>(null)
const decisionMode = ref<'modify' | 'reject' | null>(null)
const outcomeDialogVisible = ref(false)
const flowActionError = ref('')
const outcomeForm = ref({ actualRegimen: '', treatmentResponse: 'improved' as OutcomeRecord['treatmentResponse'], adverseEvent: false, followupComplete: true })

const selectedCandidate = computed(() => store.selectedCandidate)
const flowDecision = computed(() => flow.decisionFor(encounterId.value))
const flowOutcome = computed(() => flow.outcomes[encounterId.value])
const drugGuideMap: Record<string, {
  code: string
  name: string
  role: string
  indication: string
  dosage: string
  interactions: string
  adverseReactions: string
  precautions: string
  sources: string
}> = {
  'D-CEF': {
    code: 'D-CEF',
    name: '头孢曲松',
    role: '第三代头孢菌素，覆盖常见肺炎链球菌及部分革兰阴性菌。',
    indication: '社区获得性肺炎等敏感菌感染，需结合院内目录和培养结果复核。',
    dosage: '剂量待医生按院内剂量规则、肝肾功能和感染严重程度确认。',
    interactions: '避免与含钙溶液同管混合；合用抗凝药时关注出血风险。',
    adverseReactions: '胃肠道反应、皮疹、肝酶升高、胆泥样改变等。',
    precautions: '复核β内酰胺过敏史；严重肝肾功能异常或胆道风险需药师参与。',
    sources: '药品说明书；院内抗菌药物目录；CAP 诊疗指南/院内路径。'
  },
  'D-AZI': {
    code: 'D-AZI',
    name: '阿奇霉素',
    role: '大环内酯类，补充非典型病原体覆盖。',
    indication: 'CAP 组合治疗中覆盖支原体、衣原体等非典型病原体风险。',
    dosage: '剂量待医生按院内剂量规则、给药途径和疗程要求确认。',
    interactions: '合用延长 QT 药物、华法林或地高辛时需复核相互作用。',
    adverseReactions: '胃肠道反应、QT 间期延长、肝酶升高等。',
    precautions: '有心律失常、低钾低镁或肝功能异常时需强化监测。',
    sources: '药品说明书；CAP 诊疗指南/院内路径；院内相互作用规则。'
  },
  'D-AMOX': {
    code: 'D-AMOX',
    name: '阿莫西林克拉维酸钾',
    role: 'β内酰胺/β内酰胺酶抑制剂复方，覆盖常见呼吸道细菌。',
    indication: '非重症或口服序贯场景下的敏感菌感染候选方案。',
    dosage: '剂量待医生按院内剂量规则、肾功能和给药途径确认。',
    interactions: '合用华法林、别嘌醇或甲氨蝶呤时需复核相互作用。',
    adverseReactions: '腹泻、恶心、皮疹、肝功能异常等。',
    precautions: '确认青霉素过敏史；既往胆汁淤积或肝损伤需谨慎。',
    sources: '药品说明书；院内抗菌药物目录；CAP 诊疗指南/院内路径。'
  },
  'D-LEV': {
    code: 'D-LEV',
    name: '左氧氟沙星',
    role: '呼吸喹诺酮，覆盖常见及部分非典型呼吸道病原体。',
    indication: '特定条件下的 CAP 替代方案，需结合禁忌证和风险获益审核。',
    dosage: '剂量待医生按院内剂量规则和肾功能调整确认。',
    interactions: '与含金属阳离子制剂间隔给药；合用 QT 延长药或糖皮质激素需谨慎。',
    adverseReactions: '肌腱损伤、QT 延长、中枢神经反应、血糖异常、胃肠道反应等。',
    precautions: '老年、肾功能不全、癫痫风险或既往喹诺酮严重不良反应需重点复核。',
    sources: '药品说明书；院内抗菌药物目录；CAP 诊疗指南/院内路径。'
  }
}
const draftSteps = [
  { key: 'CREATED', label: '医生审核', meta: '草稿已创建' },
  { key: 'WRITE_QUEUED', label: '可靠任务', meta: '等待适配器' },
  { key: 'HIS_DRAFT_CREATED', label: 'HIS 草稿', meta: '仅草稿状态' },
  { key: 'CALLBACK_CONFIRMED', label: '状态回调', meta: '回写已确认' }
]
const currentDraftIndex = computed(() => flowDecision.value?.action === 'reject' ? -1 : draftSteps.findIndex(step => step.key === flowDecision.value?.draftStatus))
const lifecycleStatusLabel = computed(() => flowDecision.value?.action === 'reject' ? '已驳回' : flowOutcome.value ? '结局已登记' : draftSteps[currentDraftIndex.value]?.label ?? '待处理')
const nextDraftActionLabel = computed(() => ({ CREATED: '加入可靠写入任务', WRITE_QUEUED: '模拟 HIS 创建草稿', HIS_DRAFT_CREATED: '接收 HIS 状态回调' } as Record<string,string>)[String(flowDecision.value?.draftStatus)] ?? '继续')
const nextLifecycleHint = computed(() => flowOutcome.value ? '当前患者已经成为科研候选记录，可进入科研工作台重新生成队列。' : currentDraftIndex.value === draftSteps.length - 1 ? '回写状态已确认，请登记实际执行用药和患者结局。' : '按顺序推进草稿状态，每一步都会写入前端审计事件。')
const selectedBlocked = computed(() => Boolean(selectedCandidate.value?.blocked))
const blockingAlerts = computed(() => store.payload?.alerts.filter(alert => alert.blocking || alert.level === 'block') ?? [])
const strongAlerts = computed(() => store.payload?.alerts.filter(alert => alert.level === 'strong') ?? [])
const dataQualityAlerts = computed(() => store.payload?.alerts.filter(alert => alert.level === 'info' || /缺失|冲突|待确认/.test(alert.message)) ?? [])
const unresolvedAlertCount = computed(() => blockingAlerts.value.length + strongAlerts.value.length)
const missingItems = computed(() => {
  const explicit = store.payload?.missingInfo ?? []
  const factMissing = store.payload?.facts
    .filter(fact => fact.missingStatus !== 'present')
    .map(fact => `${fact.label}：${fact.value}`) ?? []
  return [...new Set([...explicit, ...factMissing])]
})
const sortedAlerts = computed(() => [...(store.payload?.alerts ?? [])].sort((a, b) => riskOrder(a.level) - riskOrder(b.level)))
const selectedEvidence = computed(() => selectedCandidate.value?.evidence ?? [])
const selectedDrugGuides = computed(() => (selectedCandidate.value?.drugCodes ?? []).map(code => drugGuideMap[code] ?? {
  code,
  name: code,
  role: '待药学知识库补充该药品的结构化说明。',
  indication: '待补充。',
  dosage: '待医生按院内剂量规则确认。',
  interactions: '待补充。',
  adverseReactions: '待补充。',
  precautions: '待补充。',
  sources: '待接入院内药品说明书、规则库或已发布证据。'
}))
const selectedDrugSourceLine = computed(() => {
  if (!selectedCandidate.value) return '选择候选方案后显示组合说明。'
  const evidenceCount = selectedCandidate.value.evidence.length
  return evidenceCount ? `结合 ${evidenceCount} 条受控证据、院内目录和药品说明书摘要。` : '当前候选缺少可定位证据，仅显示目录级药品核对要点。'
})
const historicalFacts = computed(() => store.payload?.facts.filter(fact => /历史|过敏|不良反应|跨科室/.test(fact.label)) ?? [])
const currentFacts = computed(() => store.payload?.facts.filter(fact => !historicalFacts.value.includes(fact)) ?? [])
const currentFactGroups = computed(() => {
  const groups = [
    { key: 'labs', title: '关键检验与生理指标', pattern: /检验|肌酐|CRP|C反应|肝|肾|体温|血压|心率|氧|lab/i },
    { key: 'medication', title: '当前与近期用药', pattern: /用药|药物|医嘱|处方|medication|order/i },
    { key: 'other', title: '其他决策事实', pattern: /.*/ }
  ]
  const remaining = [...currentFacts.value]
  return groups.map(group => {
    const items = remaining.filter(fact => group.pattern.test(`${fact.type} ${fact.label}`))
    items.forEach(item => remaining.splice(remaining.indexOf(item), 1))
    return { ...group, items }
  }).filter(group => group.items.length)
})
const chiefComplaintSummary = computed(() => {
  const diagnosis = store.payload?.encounter.diagnosis ?? ''
  const firstFact = currentFacts.value[0]
  return firstFact ? `${diagnosis}；${firstFact.label}：${firstFact.value}` : diagnosis
})
const safetySummaryLine = computed(() => {
  if (blockingAlerts.value.length) return `命中 ${blockingAlerts.value.length} 项硬阻断，不能生成处方草稿`
  if (strongAlerts.value.length) return `命中 ${strongAlerts.value.length} 项强提醒，需要医生记录处理`
  return '未命中硬阻断，仍需核对患者事实与证据边界'
})
const normalizedStages = computed<StageState[]>(() => {
  const stages = store.payload?.stages ?? []
  return ['patient_context', 'deterministic_rules', 'controlled_evidence', 'candidate_ranking']
    .map(name => stages.find(stage => stage.name === name) ?? { name, status: 'pending', elapsedMs: 0, detail: '等待上游阶段完成' })
})
const decisionChain = computed(() => {
  const stageMap = Object.fromEntries(normalizedStages.value.map(stage => [stage.name, stage]))
  const patientStage = stageMap.patient_context
  const ruleStage = stageMap.deterministic_rules
  const evidenceStage = stageMap.controlled_evidence
  const rankingStage = stageMap.candidate_ranking
  return [
    {
      key: 'patient',
      title: '患者事实',
      status: patientStage?.status ?? 'pending',
      summary: chiefComplaintSummary.value,
      detail: `诊断、主诉摘要、检验、过敏史和当前用药已接入；${patientStage?.elapsedMs ?? 0}ms`,
      inputs: `HIS/EMR 患者 ${store.payload?.patient.displayName ?? '-'}、诊断 ${store.payload?.encounter.diagnosis ?? '-'}、${currentFacts.value.length} 条本次事实。`,
      logic: '合并结构化诊断、检验、过敏史和当前用药；缺失值保持缺失，不按正常值填充。',
      output: chiefComplaintSummary.value
    },
    {
      key: 'rules',
      title: '硬规则校验',
      status: ruleStage?.status ?? 'pending',
      summary: safetySummaryLine.value,
      detail: ruleStage?.detail ?? '等待规则引擎返回过敏、禁忌、相互作用和缺失数据判断',
      inputs: `${store.payload?.alerts.length ?? 0} 条规则提醒、${missingItems.value.length} 项缺失或待补信息。`,
      logic: '硬阻断优先，其次强提醒；过敏、禁忌、相互作用和关键缺失均保留到审核记录。',
      output: safetySummaryLine.value
    },
    {
      key: 'deepseek',
      title: 'DeepSeek 推理',
      status: evidenceStage?.status ?? 'pending',
      summary: store.aiDegraded ? '解释服务降级，仅保留事实、规则和候选状态' : `${selectedEvidence.value.length} 条受控证据参与解释`,
      detail: evidenceStage?.detail ?? '只基于受控证据生成解释草稿，不补写缺失医学依据',
      inputs: `${selectedEvidence.value.length} 条证据片段、患者事实摘要和已生成候选方案。`,
      logic: 'DeepSeek 仅用于生成简要溯源说明；不覆盖硬规则，不直接决定药品、剂量或疗程。',
      output: store.aiDegraded ? 'AI 解释降级，页面显示确定性流程结果。' : '返回可供医生展开核对的解释摘要。'
    },
    {
      key: 'recommendation',
      title: '推荐生成',
      status: rankingStage?.status ?? 'pending',
      summary: selectedCandidate.value ? `${selectedCandidate.value.name}：${selectedCandidate.value.regimen}` : '等待候选方案生成',
      detail: rankingStage?.detail ?? '结合目录内候选、风险状态和监测要求生成可审核推荐',
      inputs: `${store.payload?.candidates.length ?? 0} 个目录内候选、风险等级、监测要求和证据状态。`,
      logic: '先排除阻断方案，再按适用理由、风险和监测负担呈现候选，医生保留最终决策权。',
      output: selectedCandidate.value ? `${selectedCandidate.value.name}：${selectedCandidate.value.regimen}` : '暂无可展示推荐。'
    }
  ]
})
const patientInitial = computed(() => store.payload?.patient.displayName.slice(0, 1) || '患')
const sexLabel = computed(() => {
  const sex = store.payload?.patient.sex.toUpperCase()
  return sex === 'F' ? '女' : sex === 'M' ? '男' : '性别未标注'
})
const decisionSummary = computed(() => {
  const result = store.decisionResult
  if (!result) return ''
  return `审核结果：${String(result.action)} · 草稿状态：${String(result.draftStatus || '无草稿')} · 草稿ID：${String(result.prescriptionDraftId || '未生成')}`
})
const decisionReceiptTitle = computed(() => {
  const action = String(store.decisionResult?.action || '')
  return action === 'reject' ? '推荐已驳回，未生成草稿' : '医生决策已保存，处方草稿已提交模拟回写'
})

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function formatCompactTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

function stageLabel(name: string) {
  return ({ patient_context: '患者事实', deterministic_rules: '硬规则', controlled_evidence: '受控证据', candidate_ranking: '候选排序' } as Record<string, string>)[name] ?? name
}

function riskOrder(level: SafetyAlert['level']) {
  return level === 'block' ? 0 : level === 'strong' ? 1 : 2
}

function riskClass(level: SafetyAlert['level']) {
  return level === 'block' ? 'is-block' : level === 'strong' ? 'is-strong' : 'is-info'
}

function riskLabel(level: SafetyAlert['level']) {
  return level === 'block' ? '阻断' : level === 'strong' ? '强提醒' : '一般提示'
}

function riskIcon(level: SafetyAlert['level']) {
  return level === 'block' ? ShieldX : level === 'strong' ? TriangleAlert : ShieldCheck
}

function factIcon(type: string) {
  return /lab|检验/i.test(type) ? Microscope : /medication|order|药/i.test(type) ? Pill : HeartPulse
}

function evidenceStatusLabel(status: string) {
  if (/published|approved/i.test(status)) return '已发布证据'
  if (/demo/i.test(status)) return '演示证据'
  return '未发布资料'
}

function cellClass(candidate: CandidatePlan) {
  return { selected: candidate.candidateId === store.selectedCandidateId, blocked: candidate.blocked }
}

function selectCandidate(candidateId: string) {
  store.selectedCandidateId = candidateId
  decisionMode.value = null
}

function startDecision(mode: 'modify' | 'reject') {
  decisionMode.value = mode
  if (mode === 'reject') reason.value = ''
}

function openRightPanel(tab: 'risks' | 'evidence' | 'quality') {
  rightTab.value = tab
  rightDrawerVisible.value = true
}

function openCandidateEvidence(candidate: CandidatePlan) {
  selectCandidate(candidate.candidateId)
  openRightPanel('evidence')
}

function showEvidence(item: EvidenceSnippet) {
  activeEvidence.value = item
  evidenceDrawerVisible.value = true
}

function showSource(fact: Fact) {
  activeFact.value = fact
  sourceDrawerVisible.value = true
}

async function load() {
  rightDrawerVisible.value = false
  decisionMode.value = null
  await router.replace(`/workbench/${encounterId.value}`)
  await store.load(encounterId.value)
}

async function loadSimulatedPatient() {
  await store.loadWorklist()
  const list = store.worklist
  if (!list.length) return
  const index = list.findIndex(item => item.encounterId === encounterId.value)
  encounterId.value = list[(index + 1 + list.length) % list.length].encounterId
  await load()
}

async function submit(action: 'adopt' | 'modify' | 'reject') {
  await store.decide(action, reason.value)
  if (store.decisionResult) decisionMode.value = null
}

function advanceDraft() {
  flowActionError.value = ''
  try {
    flow.advanceDraft(encounterId.value)
    if (flowDecision.value) store.decisionResult = { ...flowDecision.value, prescriptionDraftId: flowDecision.value.draftId }
  } catch (error) {
    flowActionError.value = error instanceof Error ? error.message : '草稿状态推进失败'
  }
}

function openOutcomeDialog() {
  outcomeForm.value.actualRegimen = flowDecision.value?.finalRegimen ?? ''
  outcomeDialogVisible.value = true
}

function saveOutcome() {
  flowActionError.value = ''
  try {
    flow.recordOutcome(encounterId.value, { ...outcomeForm.value })
    outcomeDialogVisible.value = false
  } catch (error) {
    flowActionError.value = error instanceof Error ? error.message : '结局记录失败'
  }
}

function responseLabel(value: OutcomeRecord['treatmentResponse']) {
  return ({ improved: '治疗反应改善', stable: '治疗反应稳定', worsened: '治疗反应恶化', unknown: '治疗反应未知' } as const)[value]
}

watch(() => store.selectedCandidateId, () => {
  if (store.selectedCandidate) store.modifyText = store.selectedCandidate.regimen
})

watch(() => flow.revision, async (revision, previous) => {
  if (!previous || !revision) return
  await store.loadWorklist()
  if (!store.worklist.some(item => item.encounterId === encounterId.value)) encounterId.value = store.worklist[0]?.encounterId ?? encounterId.value
  await load()
})

onMounted(async () => {
  await store.loadWorklist()
  if (!store.worklist.some(item => item.encounterId === encounterId.value)) {
    encounterId.value = store.worklist[0]?.encounterId ?? encounterId.value
  }
  await load()
})
</script>
