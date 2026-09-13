<template>
  <el-config-provider :locale="zhCn">
  <div class="product-page pharmacy-module-page">
    <header class="page-heading">
      <div>
        <div class="eyebrow">PHARMACY WORKBENCH</div>
        <h1>{{ moduleTitle }}</h1>
        <p>{{ moduleDescription }}</p>
      </div>
      <div class="page-heading-actions">
        <el-tag :type="isRetrospective ? (isPreview ? 'warning' : 'info') : 'success'" effect="plain">
          {{ isRetrospective ? (isPreview ? '合成回顾数据' : '真实接口待接入') : (flow.isReady ? 'JSON 场景已载入' : '等待数据') }}
        </el-tag>
        <el-button v-if="isPreview" :icon="FileJson2" @click="flow.importDialogVisible = true">导入验证数据</el-button>
      </div>
    </header>

    <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon :closable="false" />

    <section class="module-grid" :class="{ 'side-collapsed': !showFlowSidebar || isRetrospective }">
      <div class="module-main surface-panel">
        <div class="surface-panel-header">
          <div class="module-heading">
            <h2>{{ mainTitle }}</h2>
            <span>{{ dataSourceLabel }}</span>
          </div>
          <div class="module-header-actions">
            <el-button v-if="isRetrospective" class="pharmacy-primary-action" type="primary" :icon="Play" @click="runAnalysis">生成点评报告</el-button>
            <el-button v-else-if="isRecord" class="pharmacy-primary-action" type="primary" :icon="FilePlus2" @click="createRecord">新建药历</el-button>
            <el-button v-else-if="isEducation" class="pharmacy-primary-action" type="primary" :icon="educationMode === 'profile' ? WandSparkles : Send" :loading="educationGenerating" @click="educationMode === 'profile' && !educationText.trim() ? generateEducation() : publishEducation()">{{ educationMode === 'profile' && !educationText.trim() ? '生成专属教育' : '提交药师审核' }}</el-button>
            <el-tooltip v-if="!isRetrospective" :content="showFlowSidebar ? '收起流程与合规侧栏' : '展开流程与合规侧栏'" placement="top">
              <el-button class="focus-button" :icon="showFlowSidebar ? PanelRightClose : PanelRightOpen" circle :aria-label="showFlowSidebar ? '收起流程与合规侧栏' : '展开流程与合规侧栏'" @click="showFlowSidebar = !showFlowSidebar" />
            </el-tooltip>
          </div>
        </div>

        <div v-if="isRetrospective" class="retrospective-layout">
          <template v-if="retrospectiveData">
            <section class="retrospective-patient">
              <div class="patient-identity">
                <div class="patient-avatar">{{ retrospectiveData.patient.displayName.slice(-1) }}</div>
                <div>
                  <strong>{{ retrospectiveData.patient.displayName }}</strong>
                  <span>{{ retrospectiveData.patient.patientId }} · {{ retrospectiveData.patient.age }} 岁 · {{ retrospectiveData.patient.sex }}</span>
                </div>
              </div>
              <dl class="patient-facts">
                <div><dt>主要诊断</dt><dd>{{ retrospectiveData.patient.diagnosis }}</dd></div>
                <div><dt>出院日期</dt><dd>{{ retrospectiveData.patient.dischargeDate }}</dd></div>
                <div><dt>治疗目标</dt><dd>{{ retrospectiveData.patient.treatmentGoal }}</dd></div>
              </dl>
            </section>

            <div class="review-kpi-grid">
              <div><strong>{{ reviewRows.length }}</strong><span>纳入点评药物</span><small>医院医嘱 {{ hospitalRows.length }} · 自购药 {{ selfPurchasedRows.length }}</small></div>
              <div><strong>{{ assessmentCounts.suspected_unreasonable }}</strong><span>疑似不合理</span><small>需逐条核对实际服用记录</small></div>
              <div><strong>{{ assessmentCounts.insufficient }}</strong><span>信息不足</span><small>不将未知值当作合理</small></div>
              <div><strong>{{ conflictRows.length }}</strong><span>医嘱与自购药关联提示</span><small>单独列示潜在冲突</small></div>
            </div>

            <div class="review-toolbar">
              <el-radio-group v-model="reviewFilter" size="small">
                <el-radio-button label="all">全部 {{ reviewRows.length }}</el-radio-button>
                <el-radio-button label="hospital">医院医嘱 {{ hospitalRows.length }}</el-radio-button>
                <el-radio-button label="self_purchased">出院后自购药 {{ selfPurchasedRows.length }}</el-radio-button>
              </el-radio-group>
              <el-input v-model="searchKeyword" clearable placeholder="搜索药品、结论或证据" :prefix-icon="Search" />
            </div>

            <div class="review-workspace">
              <div class="review-table-panel">
                <div class="table-caption"><strong>逐条用药合理性点评</strong><span>点击一行后在右侧查看完整记录与证据</span></div>
                <div class="review-table-scroll">
                  <table class="review-table">
                    <thead><tr><th>结论</th><th>来源</th><th>药品</th><th>用法用量记录</th><th>适应证/治疗目标</th><th>风险</th><th>操作</th></tr></thead>
                    <tbody>
                      <tr v-for="row in filteredReviewRows" :key="row.id" :class="{ selected: selectedReviewId === row.id }" tabindex="0" @click="selectedReviewId = row.id" @keydown.enter="selectedReviewId = row.id">
                        <td><el-tag size="small" :type="assessmentType(row.assessment)">{{ assessmentLabel(row.assessment) }}</el-tag></td>
                        <td><span class="source-label" :class="row.source">{{ sourceLabel(row.source) }}</span></td>
                        <td><strong class="drug-name">{{ row.drugName }}</strong><small>{{ row.course }}</small></td>
                        <td><span>{{ row.dose }}</span><small>{{ row.route }} · {{ row.frequency }}</small></td>
                        <td>{{ row.indication }}</td>
                        <td><el-tag size="small" effect="plain" :type="riskType(row.risk)">{{ riskLabel(row.risk) }}</el-tag></td>
                        <td><button class="table-action" type="button" @click.stop="selectedReviewId = row.id">查看点评</button></td>
                      </tr>
                      <tr v-if="!filteredReviewRows.length"><td colspan="7" class="empty-cell">没有符合当前筛选条件的用药记录。</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <aside v-if="selectedReview" class="review-detail-panel">
                <div class="detail-header"><div><span class="eyebrow">REVIEW DETAIL</span><h3>{{ selectedReview.drugName }}</h3></div><el-tag :type="assessmentType(selectedReview.assessment)">{{ assessmentLabel(selectedReview.assessment) }}</el-tag></div>
                <dl class="detail-facts">
                  <div><dt>记录来源</dt><dd>{{ sourceLabel(selectedReview.source) }}</dd></div>
                  <div><dt>用药窗口</dt><dd>{{ selectedReview.course }}</dd></div>
                  <div><dt>给药信息</dt><dd>{{ selectedReview.dose }} · {{ selectedReview.route }} · {{ selectedReview.frequency }}</dd></div>
                  <div><dt>适应证记录</dt><dd>{{ selectedReview.indication }}</dd></div>
                </dl>
                <section class="detail-block"><h4>判断依据与证据片段</h4><ul><li v-for="evidence in selectedReview.evidence" :key="evidence">{{ evidence }}</li></ul><p class="evidence-snippet">{{ selectedReview.evidenceSnippet }}</p></section>
                <section v-if="selectedReview.conflictWith?.length" class="detail-block conflict-block"><h4>与医院医嘱的关联提示</h4><p>可能关联：{{ selectedReview.conflictWith.join('、') }}</p><small>当前仅为演示规则提示，需结合出院带药清单与实际服用记录核对。</small></section>
                <section class="detail-block"><h4>改善建议</h4><p>{{ selectedReview.suggestion }}</p></section>
                <div class="detail-boundary">点评只基于本条已导入记录，不推测未提供的意图或事实。</div>
              </aside>
              <div v-else class="review-detail-empty"><Search :size="20" /><strong>选择一条用药记录</strong><span>右侧将展开该药的完整用法、证据、结论和改善建议。</span></div>
            </div>

            <section v-if="reportReady" class="report-panel">
              <div class="report-header"><div><span class="eyebrow">RETROSPECTIVE REPORT</span><h3>结构化回顾性用药合理性点评报告</h3></div><span class="report-version">{{ retrospectiveData.schema }} · {{ retrospectiveData.analysisDate }}</span></div>
              <section class="report-section"><h4>一、分析范围与数据边界</h4><p>本次分析覆盖患者出院前医院医嘱 {{ hospitalRows.length }} 条，以及出院后自购药记录 {{ selfPurchasedRows.length }} 条。分析仅使用已导入记录，医院医嘱与自购药分别保留来源，不将缺失信息补全为正常。</p><p class="report-boundary">{{ retrospectiveData.boundary }}</p></section>
              <section class="report-section"><h4>二、逐条点评结论</h4><table class="report-table"><thead><tr><th>药品</th><th>来源</th><th>结论</th><th>判断摘要</th></tr></thead><tbody><tr v-for="row in reviewRows" :key="`report-${row.id}`"><td><strong>{{ row.drugName }}</strong></td><td>{{ sourceLabel(row.source) }}</td><td><el-tag size="small" :type="assessmentType(row.assessment)">{{ assessmentLabel(row.assessment) }}</el-tag></td><td>{{ row.evidenceSnippet }}</td></tr></tbody></table></section>
              <section v-if="issueRows.length" class="report-section"><h4>三、疑似不合理用药</h4><article v-for="issue in issueRows" :key="`issue-${issue.id}`" class="issue-item"><div class="issue-title"><strong>{{ issue.drugName }}</strong><el-tag size="small" :type="riskType(issue.risk)">{{ riskLabel(issue.risk) }}风险</el-tag></div><dl><div><dt>问题描述</dt><dd>该记录与既往医院用药时间或治疗目标存在需要核对的衔接问题，当前不能直接认定为已发生重复用药。</dd></div><div><dt>判断依据</dt><dd>{{ issue.evidenceSnippet }}</dd></div><div><dt>改善建议</dt><dd>{{ issue.suggestion }}</dd></div></dl></article></section>
              <section v-if="conflictRows.length" class="report-section conflict-report"><h4>四、医院医嘱与自购药潜在冲突</h4><p v-for="row in conflictRows" :key="`conflict-${row.id}`"><strong>{{ row.drugName }}</strong>（自购药）与 {{ row.conflictWith?.join('、') }} 存在时间或治疗目标关联，须补充出院带药和实际服用记录后复核。</p></section>
              <section class="report-section"><h4>五、信息不足与后续核对项</h4><ul class="missing-list"><li v-for="item in retrospectiveData.missingInfo" :key="item">{{ item }}</li></ul></section>
            </section>
            <div v-else class="report-not-ready"><ShieldCheck :size="18" /><span>点击“生成点评报告”后展示结构化结论；生产环境需由真实回顾接口提供结果。</span></div>
          </template>
          <div v-else class="module-empty page-empty"><ShieldCheck :size="24" /><strong>暂无可点评的出院后用药记录</strong><span>当前环境未接入真实回顾接口，不生成假分析结果。</span></div>
        </div>

        <div v-else-if="isRecord" class="record-layout">
          <template v-if="isPreview && flow.isReady">
            <section class="record-selection-bar">
              <div><span class="eyebrow">重点患者选择</span><h3>选择需要建立药历的少数患者</h3><p>药历由药师主动选择，不为全部患者自动建立。</p></div>
              <div class="record-selection-controls"><el-select v-model="recordPatientFilter" size="small" aria-label="筛选药历患者"><el-option label="重点候选" value="priority"/><el-option label="全部患者" value="all"/></el-select><el-tag type="warning" effect="plain">本月目标 2 例 · 已完成 {{ completedRecordCount }} 例</el-tag></div>
            </section>

            <div class="record-workspace">
              <aside class="record-patient-list" aria-label="重点患者列表">
                <div class="record-list-header"><strong>临床科室患者</strong><span>{{ filteredRecordPatients.length }} 人</span></div>
                <button v-for="item in filteredRecordPatients" :key="item.encounterId" type="button" class="record-patient-item" :class="{ selected: selectedRecordEncounterId === item.encounterId }" @click="selectRecordPatient(item.encounterId)">
                  <span class="record-avatar">{{ item.displayName.slice(-1) }}</span>
                  <span><strong>{{ item.displayName }} · {{ item.age }}岁</strong><small>{{ item.diagnosis }}</small><small>{{ recordPatientReason(item.encounterId) }}</small></span>
                  <el-tag size="small" :type="recordPatientType(item.encounterId)" effect="plain">{{ recordPatientStatus(item.encounterId) }}</el-tag>
                </button>
                <div v-if="!filteredRecordPatients.length" class="record-list-empty">当前筛选下没有重点患者候选。</div>
              </aside>

              <section v-if="selectedRecordWorkbench" class="record-template" aria-label="药历模板填写区">
                <header class="record-document-header">
                  <div><span class="eyebrow">药历模板 · v1.0</span><h3>{{ selectedRecordWorkbench.patient.displayName }} 的重点患者药历</h3><p>{{ selectedRecordWorkbench.encounter.department }} · {{ selectedRecordWorkbench.encounter.diagnosis }} · 当前就诊 {{ selectedRecordWorkbench.encounter.encounterId }}</p></div>
                  <div class="record-document-status"><el-tag type="warning" effect="plain">{{ recordFormStatus }}</el-tag><span>自动导入 {{ autoImportedCount }} 项</span><el-dropdown v-if="isPreview" trigger="click" @command="handleRecordExport"><el-button class="pharmacy-primary-action" type="primary" size="small" :icon="Download">导出药历</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="docx">导出 Word（.docx）</el-dropdown-item><el-dropdown-item command="pdf">导出 PDF（打印保存）</el-dropdown-item></el-dropdown-menu></template></el-dropdown><el-button size="small" :icon="Eye" :disabled="!selectedRecordWorkbench" @click="recordPreviewVisible = true">预览药历</el-button><el-button size="small" type="primary" :icon="Save" @click="saveRecord">保存药历草稿</el-button></div>
                </header>

                <section class="record-template-section auto-section"><div class="record-section-heading"><div><span>01</span><h4>患者基本信息</h4></div><el-tag size="small" type="success" effect="plain">系统自动导入</el-tag></div><div class="record-field-table"><div v-for="field in autoPatientFields" :key="field.label" class="record-field-row"><strong>{{ field.label }}</strong><span>{{ field.value || '未返回' }}</span><small>{{ field.source }}</small></div></div></section>

                <section class="record-template-section"><div class="record-section-heading"><div><span>02</span><h4>建立药历原因与患者关注点</h4></div><el-tag size="small" effect="plain">药师填写</el-tag></div><div class="record-form-grid"><label><span>建立原因</span><el-select v-model="recordDraft.selectionReason" placeholder="请选择建立原因"><el-option v-for="item in recordReasonOptions" :key="item" :label="item" :value="item"/></el-select></label><label><span>信息来源</span><el-select v-model="recordDraft.interviewSource" placeholder="请选择信息来源"><el-option v-for="item in interviewSourceOptions" :key="item" :label="item" :value="item"/></el-select></label><label class="field-wide"><span>患者关注点 / 药师现场补充</span><el-input v-model="recordDraft.patientConcern" type="textarea" :rows="3" placeholder="记录患者或家属口述、用药疑问和药师查房观察。"/></label></div></section>

                <section class="record-template-section"><div class="record-section-heading"><div><span>03</span><h4>病史、家族史与当前诊断</h4></div><el-tag size="small" effect="plain">自动导入 + 药师补充</el-tag></div><div class="record-fact-panels"><article><strong>系统导入诊断</strong><p>{{ selectedRecordWorkbench.encounter.diagnosis }}</p><small>来源：当前就诊事实 · v{{ selectedRecordWorkbench.encounter.dataVersion }}</small></article><article><strong>过敏 / 不良反应</strong><p>{{ autoAllergySummary }}</p><small>来源：患者安全摘要</small></article><label><span>既往病史 / 家族史补充</span><el-input v-model="recordDraft.historySummary" type="textarea" :rows="3" placeholder="只补充药历关注的既往疾病、家族史和用药相关信息。"/></label></div></section>

                <section class="record-template-section"><div class="record-section-heading"><div><span>04</span><h4>患者家庭用药访谈</h4></div><el-tag size="small" effect="plain">药师询问填写</el-tag></div><div class="record-interview-grid"><label><span>是否长期服药</span><el-select v-model="recordDraft.homeMedicationStatus"><el-option label="是" value="yes"/><el-option label="否" value="no"/><el-option label="不清楚" value="unknown"/></el-select></label><label><span>用药依从性</span><el-select v-model="recordDraft.adherence"><el-option label="基本按时" value="good"/><el-option label="偶尔漏服" value="occasional"/><el-option label="经常漏服" value="poor"/><el-option label="不清楚" value="unknown"/></el-select></label><label class="field-wide"><span>患者口述的家庭药物、用法用量及不良反应</span><el-input v-model="recordDraft.homeMedicationNarrative" type="textarea" :rows="4" placeholder="例如：药品名称、每次剂量、每日次数、服用时间、是否自行停药及出现的不适。"/></label></div></section>

                <section class="record-template-section"><div class="record-section-heading"><div><span>05</span><h4>住院期间用药与变更记录</h4></div><div><el-tag size="small" type="success" effect="plain">自动导入 {{ autoMedicationEventCount }} 条</el-tag><el-button size="small" :icon="Plus" @click="addMedicationEvent">新增变更</el-button></div></div><div class="medication-event-table"><div class="medication-event-row event-head"><span>时间</span><span>变更</span><span>药品</span><span>用法用量</span><span>调整原因 / 记录</span><span>来源</span></div><div v-for="event in medicationEvents" :key="event.id" class="medication-event-row"><el-date-picker v-model="event.eventDate" type="date" value-format="YYYY-MM-DD" size="small"/><el-select v-model="event.eventType" size="small"><el-option v-for="item in medicationEventTypes" :key="item.value" :label="item.label" :value="item.value"/></el-select><el-input v-model="event.drugName" size="small" placeholder="选择或填写药品"/><el-input v-model="event.regimen" size="small" placeholder="剂量 · 频次 · 途径"/><el-input v-model="event.reason" size="small" placeholder="药师补充原因"/><span class="event-source" :class="event.source">{{ event.source === 'system' ? '系统导入' : '药师填写' }}</span></div><div v-if="!medicationEvents.length" class="record-table-empty">当前接口未返回用药事件，请由药师新增记录。</div></div></section>

                <section class="record-template-section"><div class="record-section-heading"><div><span>06</span><h4>药师用药分析与建议</h4></div><el-tag size="small" effect="plain">药师填写 · 医生最终决定</el-tag></div><div class="record-form-grid"><label class="field-wide"><span>方案分析</span><el-input v-model="recordDraft.analysis" type="textarea" :rows="4" placeholder="分析治疗目标、当前用药问题、药品变更与患者病情变化的关系。"/></label><label class="field-wide"><span>药师建议</span><el-input v-model="recordDraft.recommendation" type="textarea" :rows="4" placeholder="填写建议调整的药品、用法、监测项和沟通重点，不直接生成正式医嘱。"/></label></div></section>

                <section class="record-template-section collaboration-section"><div class="record-section-heading"><div><span>07</span><h4>查房沟通与医生处理结果</h4></div><el-tag size="small" type="warning" effect="plain">等待医生处理</el-tag></div><div class="record-form-grid"><label><span>医生处理结果</span><el-select v-model="recordDraft.physicianDecision"><el-option label="待沟通" value="pending"/><el-option label="采纳建议" value="accepted"/><el-option label="修改后执行" value="modified"/><el-option label="不采纳" value="rejected"/><el-option label="暂不处理" value="deferred"/></el-select></label><label><span>沟通日期</span><el-date-picker v-model="recordDraft.communicationDate" type="date" value-format="YYYY-MM-DD"/></label><label class="field-wide"><span>查房沟通记录 / 医生反馈</span><el-input v-model="recordDraft.communicationNote" type="textarea" :rows="3" placeholder="记录药师与医生讨论的重点、医生最终意见和方案执行情况。"/></label></div></section>
              </section>
              <div v-else class="module-empty record-template-empty"><FilePlus2 :size="24"/><strong>请选择一名重点患者</strong><span>药历不是全量患者记录，选择患者后系统才会导入模板事实。</span></div>
            </div>
          </template>
          <div v-else class="module-empty page-empty"><FilePlus2 :size="24"/><strong>暂无可建立药历的真实患者</strong><span>当前环境未接入药历生产接口，不使用页面内置数据替代真实患者信息。</span></div>
        </div>

        <div v-else-if="isEducation && educationReady" class="education-layout">
          <section class="education-patient-bar">
            <div class="education-patient-identity">
              <span class="scope-avatar">患</span>
              <div><strong>{{ educationPatient }}</strong><span>{{ selectedEducationItem?.department }} · {{ selectedEducationItem?.diagnosis }}</span></div>
            </div>
            <div class="education-patient-controls">
              <el-select v-model="educationEncounterId" size="small" placeholder="选择患者" aria-label="选择教育患者">
                <el-option v-for="item in educationPatients" :key="item.encounterId" :label="`${item.displayName} · ${item.encounterId}`" :value="item.encounterId" />
              </el-select>
              <el-tag type="warning" effect="plain">需药师审核</el-tag>
            </div>
          </section>

          <section class="education-mode-bar">
            <div><span class="eyebrow">MEDICATION EDUCATION</span><h3>选择教育方式</h3><p>手写内容或基于患者画像生成可编辑草稿，均不会直接发送给患者。</p></div>
            <el-radio-group v-model="educationMode" size="small">
              <el-radio-button label="manual">医师手写</el-radio-button>
              <el-radio-button label="profile">患者画像辅助</el-radio-button>
            </el-radio-group>
          </section>

          <div class="education-workspace">
            <section class="education-editor-panel">
              <template v-if="educationMode === 'manual'">
                <div class="education-section-heading"><div><span class="education-step">01</span><div><h3>医师手写教育</h3><p>由医师直接编写患者需要理解和执行的用药事项。</p></div></div><el-tag size="small" effect="plain">人工编辑</el-tag></div>
                <el-input v-model="educationText" type="textarea" :rows="12" placeholder="输入用药目的、每种药怎么用、漏服处理、风险信号、监测与复诊安排。" @input="educationGeneratedBy = 'manual'" />
                <el-checkbox-group v-model="educationGoals" class="education-goals">
                  <el-checkbox v-for="goal in educationGoalOptions" :key="goal.value" :label="goal.value">{{ goal.label }}</el-checkbox>
                </el-checkbox-group>
              </template>

              <template v-else>
                <div class="education-section-heading"><div><span class="education-step">01</span><div><h3>患者分类与辅助画像</h3><p>画像只用于调整表达方式和沟通重点，不改变药品、剂量或正式医嘱。</p></div></div><el-tag size="small" type="success" effect="plain">辅助生成</el-tag></div>
                <div class="education-profile-grid">
                  <label><span>患者类别</span><el-select v-model="educationProfile.category"><el-option v-for="item in educationCategories" :key="item.value" :label="item.label" :value="item.value" /></el-select></label>
                  <label><span>理解能力</span><el-select v-model="educationProfile.literacy"><el-option label="普通理解" value="general" /><el-option label="需要简化表达" value="low" /><el-option label="专业理解" value="professional" /></el-select></label>
                  <label><span>沟通方式</span><el-select v-model="educationProfile.communication"><el-option label="短句 + 要点" value="plain" /><el-option label="详细说明" value="detailed" /><el-option label="专业术语" value="technical" /></el-select></label>
                  <label><span>执行主体</span><el-select v-model="educationProfile.caregiver"><el-option label="患者本人" value="self" /><el-option label="家属 / 照护者" value="caregiver" /><el-option label="医护协助" value="professional" /></el-select></label>
                  <label><span>依从性风险</span><el-select v-model="educationProfile.adherenceRisk"><el-option label="暂不确定" value="unknown" /><el-option label="低风险" value="low" /><el-option label="需要重点提醒" value="high" /></el-select></label>
                  <label class="education-profile-wide"><span>医师补充画像</span><el-input v-model="educationProfile.notes" type="textarea" :rows="2" placeholder="补充患者口述、记忆困难、照护安排或本次沟通重点。" /></label>
                </div>
                <div class="education-goal-heading"><strong>本次教育目的</strong><span>生成内容只覆盖勾选的重点</span></div>
                <el-checkbox-group v-model="educationGoals" class="education-goals">
                  <el-checkbox v-for="goal in educationGoalOptions" :key="goal.value" :label="goal.value">{{ goal.label }}</el-checkbox>
                </el-checkbox-group>
                <section class="education-fact-table">
                  <div class="education-fact-header"><strong>将用于辅助生成的用药事实</strong><span>来自当前患者上下文</span></div>
                  <div v-for="fact in educationMedicationFacts" :key="fact.sourceId" class="education-fact-row"><strong>{{ fact.label }}</strong><span>{{ fact.value }}</span><small>{{ fact.source }}</small></div>
                  <div v-if="!educationMedicationFacts.length" class="education-fact-empty">当前接口未返回用药明细，不能据此补写药品或剂量。</div>
                  <div v-for="fact in educationSafetyFacts" :key="fact.sourceId" class="education-fact-row education-safety-row"><strong>{{ fact.label }}</strong><span>{{ fact.value }}</span><small>安全事实</small></div>
                  <div v-for="item in educationMissingInfo" :key="item" class="education-fact-row education-missing-row"><strong>待确认</strong><span>{{ item }}</span><small>缺失信息</small></div>
                </section>
                <el-button type="primary" :icon="WandSparkles" :loading="educationGenerating" @click="generateEducation">生成专属用药教育</el-button>
              </template>

              <section class="education-result-panel">
                <div class="education-section-heading"><div><span class="education-step">02</span><div><h3>可编辑教育草稿</h3><p>生成结果必须由医师 / 药师核对后才能进入审核流。</p></div></div><el-tag v-if="educationGeneratedBy === 'deepseek'" size="small" type="success" effect="plain">DeepSeek 草稿</el-tag><el-tag v-else-if="educationGeneratedBy === 'local-fallback'" size="small" type="warning" effect="plain">本地规则草稿</el-tag><el-tag v-else size="small" effect="plain">待填写</el-tag></div>
                <el-input v-model="educationText" type="textarea" :rows="12" placeholder="教育内容将在这里显示，医师可以继续修改。" />
                <div class="education-result-footer"><span><CheckCircle2 :size="15" /> 不发送患者 · 不改变处方 · 需药师审核</span><el-button type="primary" :icon="Send" :disabled="!educationText.trim()" @click="publishEducation">提交药师审核</el-button></div>
              </section>
            </section>

            <aside class="education-side-panel">
              <div class="education-side-heading"><UserRound :size="17" /><strong>患者事实摘要</strong></div>
              <dl class="education-facts">
                <div><dt>当前诊断</dt><dd>{{ selectedEducationWorkbench?.encounter.diagnosis || '未返回' }}</dd></div>
                <div><dt>年龄 / 性别</dt><dd>{{ selectedEducationWorkbench?.patient.age }} 岁 · {{ selectedEducationWorkbench?.patient.sex || '未返回' }}</dd></div>
                <div><dt>当前用药</dt><dd>{{ educationMedicationFacts.length }} 条系统事实</dd></div>
                <div><dt>过敏 / 不良反应</dt><dd>{{ educationSafetyFacts.length ? educationSafetyFacts.map(fact => fact.value).join('；') : '未返回已确认记录' }}</dd></div>
              </dl>
              <div class="education-boundary"><strong>使用边界</strong><p>画像辅助只改变表达层级、提醒方式和沟通重点。未知事实必须保留为“待确认”，模型不得生成剂量、频次或停药方案。</p></div>
            </aside>
          </div>
        </div>
        <div v-else class="module-empty page-empty"><Send :size="24" /><strong>暂无可生成教育任务的患者</strong><span>完成处方审核并加载患者用药方案后，教育内容才会进入编辑区。</span></div>
      </div>

      <aside v-if="showFlowSidebar && !isRetrospective" class="module-side">
        <template v-if="isRecord">
          <section class="surface-panel record-progress-panel"><div class="surface-panel-header"><h2>药历完成状态</h2><span>{{ recordCompletion }}%</span></div><div class="record-progress-bar"><span :style="{ width: `${recordCompletion}%` }"></span></div><ul><li v-for="item in recordProgressItems" :key="item.label" :class="{ done: item.done }"><span>{{ item.done ? '✓' : '·' }}</span><div><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></div></li></ul></section>
          <section class="surface-panel safety-mini"><div class="surface-panel-header"><h2>数据来源边界</h2></div><ul><li>患者与诊断：系统自动导入</li><li>当前用药：接口返回后保留来源</li><li>家庭用药：药师访谈填写</li><li>药品变更：药师手动记录</li><li>建议执行：医生最终决定</li></ul></section>
          <section class="surface-panel record-billing-panel"><div class="surface-panel-header"><h2>药学服务计费</h2><el-tag size="small" type="warning" effect="plain">待完成</el-tag></div><p>药历仅针对重点患者建立，完成并审核后进入收费核对。</p><span>本月目标：2 例 · 不自动计费</span></section>
        </template>
        <template v-else>
          <section class="surface-panel"><div class="surface-panel-header"><h2>流程状态</h2><span>{{ flow.researchProgress }}/8</span></div><div class="flow-steps"><div v-for="step in flowSteps" :key="step.label" :class="{ done: step.done }"><span>{{ step.done ? '✓' : '·' }}</span><div><strong>{{ step.label }}</strong><small>{{ step.detail }}</small></div></div></div></section>
          <section class="surface-panel safety-mini"><div class="surface-panel-header"><h2>数据与合规边界</h2></div><ul><li>事实来源与来源版本保留</li><li>研究数据必须去标识化</li><li>报告先为可审阅草稿</li><li>知识发布需要多人审核</li></ul></section>
        </template>
      </aside>
    </section>
  </div>
  <el-dialog v-model="recordPreviewVisible" title="药历预览" width="980px" class="record-preview-dialog" :close-on-click-modal="false">
    <div v-if="selectedRecordWorkbench" class="record-preview-document">
      <header class="record-preview-header"><div><span class="eyebrow">PHARMACY MEDICATION RECORD · v1.0</span><h2>{{ selectedRecordWorkbench.patient.displayName }} 药历</h2><p>{{ selectedRecordWorkbench.encounter.department }} · {{ selectedRecordWorkbench.encounter.diagnosis }} · {{ selectedRecordWorkbench.encounter.encounterId }}</p></div><div><el-tag type="warning" effect="plain">{{ recordFormStatus }}</el-tag><small>来源：当前前端草稿</small></div></header>
      <section class="record-preview-section"><h3>一、患者基本信息</h3><div class="record-preview-facts"><div v-for="field in autoPatientFields" :key="`preview-${field.label}`"><strong>{{ field.label }}</strong><span>{{ field.value || '未返回' }}</span></div></div></section>
      <section class="record-preview-section"><h3>二、建立药历与患者关注点</h3><dl class="record-preview-dl"><div><dt>建立原因</dt><dd>{{ recordDraft.selectionReason || '未填写' }}</dd></div><div><dt>访谈来源</dt><dd>{{ recordDraft.interviewSource || '未填写' }}</dd></div><div class="wide"><dt>患者关注点</dt><dd>{{ recordDraft.patientConcern || '未填写' }}</dd></div></dl></section>
      <section class="record-preview-section"><h3>三、病史、家族史与安全摘要</h3><dl class="record-preview-dl"><div><dt>当前诊断</dt><dd>{{ selectedRecordWorkbench.encounter.diagnosis }}</dd></div><div><dt>过敏 / 不良反应</dt><dd>{{ autoAllergySummary }}</dd></div><div class="wide"><dt>既往病史 / 家族史</dt><dd>{{ recordDraft.historySummary || '未填写' }}</dd></div></dl></section>
      <section class="record-preview-section"><h3>四、患者家庭用药访谈</h3><dl class="record-preview-dl"><div><dt>是否长期服药</dt><dd>{{ homeMedicationLabel(recordDraft.homeMedicationStatus) }}</dd></div><div><dt>用药依从性</dt><dd>{{ adherenceLabel(recordDraft.adherence) }}</dd></div><div class="wide"><dt>家庭药物及不良反应</dt><dd>{{ recordDraft.homeMedicationNarrative || '未填写' }}</dd></div></dl></section>
      <section class="record-preview-section"><h3>五、住院期间用药与变更记录</h3><table class="record-preview-table"><thead><tr><th>时间</th><th>变更</th><th>药品</th><th>用法用量</th><th>调整原因 / 记录</th><th>来源</th></tr></thead><tbody><tr v-for="event in medicationEvents" :key="`preview-event-${event.id}`"><td>{{ event.eventDate || '未填写' }}</td><td>{{ medicationEventLabel(event.eventType) }}</td><td>{{ event.drugName || '未填写' }}</td><td>{{ event.regimen || '未填写' }}</td><td>{{ event.reason || '未填写' }}</td><td>{{ event.source === 'system' ? '系统导入' : '药师填写' }}</td></tr><tr v-if="!medicationEvents.length"><td colspan="6">暂无用药变更记录</td></tr></tbody></table></section>
      <section class="record-preview-section"><h3>六、药师用药分析与建议</h3><dl class="record-preview-dl"><div class="wide"><dt>方案分析</dt><dd>{{ recordDraft.analysis || '未填写' }}</dd></div><div class="wide"><dt>药师建议</dt><dd>{{ recordDraft.recommendation || '未填写' }}</dd></div></dl></section>
      <section class="record-preview-section"><h3>七、查房沟通与医生处理结果</h3><dl class="record-preview-dl"><div><dt>处理结果</dt><dd>{{ physicianDecisionLabel(recordDraft.physicianDecision) }}</dd></div><div><dt>沟通日期</dt><dd>{{ recordDraft.communicationDate || '未填写' }}</dd></div><div class="wide"><dt>沟通记录 / 医生反馈</dt><dd>{{ recordDraft.communicationNote || '未填写' }}</dd></div></dl></section>
    </div>
    <div v-else class="record-preview-empty">请选择患者后再预览药历。</div>
    <template #footer><el-button @click="recordPreviewVisible = false">关闭预览</el-button><el-dropdown v-if="isPreview" trigger="click" @command="handleRecordExport"><el-button class="pharmacy-primary-action" type="primary" :icon="Download">导出药历</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="docx">导出 Word（.docx）</el-dropdown-item><el-dropdown-item command="pdf">导出 PDF（打印保存）</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template>
  </el-dialog>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CheckCircle2, Download, Eye, FileJson2, FilePlus2, PanelRightClose, PanelRightOpen, Play, Plus, Save, Search, Send, ShieldCheck, UserRound, WandSparkles } from 'lucide-vue-next'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useRoute } from 'vue-router'
import retrospectiveReviewJson from '../data/retrospective-review.json'
import { generateMedicationEducation } from '../services/deepseek'
import { useFlowSimulationStore } from '../stores/flowSimulation'

type ReviewAssessment = 'reasonable' | 'suspected_unreasonable' | 'insufficient'
type ReviewSource = 'hospital' | 'self_purchased'
type ReviewRisk = 'high' | 'medium' | 'low'

interface RetrospectiveMedicationRecord {
  id: string
  drugName: string
  source: ReviewSource
  route: string
  dose: string
  frequency: string
  course: string
  indication: string
  assessment: ReviewAssessment
  risk: ReviewRisk
  evidence: string[]
  evidenceSnippet: string
  suggestion: string
  conflictWith?: string[]
}

interface RetrospectiveReviewFixture {
  schema: string
  synthetic: boolean
  sourceLabel: string
  analysisDate: string
  patient: { patientId: string; displayName: string; age: number; sex: string; diagnosis: string; dischargeDate: string; treatmentGoal: string }
  hospitalOrders: RetrospectiveMedicationRecord[]
  selfPurchasedMeds: RetrospectiveMedicationRecord[]
  missingInfo: string[]
  boundary: string
}

type RecordPatientFilter = 'priority' | 'all'
type PhysicianDecision = 'pending' | 'accepted' | 'modified' | 'rejected' | 'deferred'
type EducationMode = 'manual' | 'profile'

interface RecordDraft {
  selectionReason: string
  interviewSource: string
  patientConcern: string
  historySummary: string
  homeMedicationStatus: 'yes' | 'no' | 'unknown'
  adherence: 'good' | 'occasional' | 'poor' | 'unknown'
  homeMedicationNarrative: string
  analysis: string
  recommendation: string
  physicianDecision: PhysicianDecision
  communicationDate: string
  communicationNote: string
  saved: boolean
}

interface MedicationEventDraft {
  id: string
  eventDate: string
  eventType: string
  drugName: string
  regimen: string
  reason: string
  source: 'system' | 'pharmacist'
}

function emptyRecordDraft(): RecordDraft {
  return { selectionReason: '', interviewSource: '', patientConcern: '', historySummary: '', homeMedicationStatus: 'unknown', adherence: 'unknown', homeMedicationNarrative: '', analysis: '', recommendation: '', physicianDecision: 'pending', communicationDate: '', communicationNote: '', saved: false }
}

const route = useRoute()
const flow = useFlowSimulationStore()
const isPreview = import.meta.env.VITE_UI_PREVIEW === 'true'
const retrospectiveFixture = retrospectiveReviewJson as RetrospectiveReviewFixture
const errorMessage = ref('')
const educationText = ref('')
const educationMode = ref<EducationMode>('manual')
const educationEncounterId = ref('')
const educationGenerating = ref(false)
const educationGeneratedBy = ref<'manual' | 'deepseek' | 'local-fallback' | ''>('')
const educationProfile = ref({ category: 'general_adult', literacy: 'general', communication: 'plain', caregiver: 'self', adherenceRisk: 'unknown', notes: '' })
const educationGoals = ref(['purpose', 'method', 'missed_dose', 'warning', 'monitoring'])
const showFlowSidebar = ref(true)
const reviewFilter = ref<'all' | ReviewSource>('all')
const searchKeyword = ref('')
const selectedReviewId = ref('')
const reportReady = ref(isPreview)
const selectedPatient = computed(() => isPreview && flow.worklist[0] ? flow.worklist[0].displayName : '未选择患者')
const educationChecks = ref({ purpose: false, method: false, warning: false, followup: false })
const educationCategories = [
  { value: 'older_low_literacy', label: '老年 / 记忆或视听困难' },
  { value: 'general_adult', label: '普通成人' },
  { value: 'professional', label: '医务 / 药学专业人士' },
  { value: 'caregiver', label: '家属照护 / 代管用药' },
  { value: 'polypharmacy', label: '多重用药 / 依从性风险' }
]
const educationGoalOptions = [
  { value: 'purpose', label: '用药目的' },
  { value: 'method', label: '服用方法' },
  { value: 'missed_dose', label: '漏服与停药处理' },
  { value: 'warning', label: '风险信号' },
  { value: 'monitoring', label: '监测与复诊' },
  { value: 'storage', label: '储存与操作' }
]
const educationPatients = computed(() => isPreview ? flow.worklist : [])
const selectedEducationItem = computed(() => educationPatients.value.find(item => item.encounterId === educationEncounterId.value) ?? educationPatients.value[0])
const selectedEducationWorkbench = computed(() => selectedEducationItem.value ? flow.getWorkbench(selectedEducationItem.value.encounterId) : undefined)
const educationPatient = computed(() => selectedEducationItem.value?.displayName ?? '未选择患者')
const educationMedicationFacts = computed(() => selectedEducationWorkbench.value?.facts.filter(fact => /medication|order|用药|医嘱|处方/i.test(`${fact.type} ${fact.label}`)) ?? [])
const educationSafetyFacts = computed(() => selectedEducationWorkbench.value?.facts.filter(fact => /allergy|adverse|过敏|不良反应|adr/i.test(`${fact.type} ${fact.label}`)) ?? [])
const educationMissingInfo = computed(() => selectedEducationWorkbench.value?.missingInfo ?? [])
const recordPatientFilter = ref<RecordPatientFilter>('priority')
const selectedRecordEncounterId = ref('')
const recordDrafts = ref<Record<string, RecordDraft>>({})
const recordEvents = ref<Record<string, MedicationEventDraft[]>>({})
const recordDraft = ref<RecordDraft>(emptyRecordDraft())
const medicationEvents = ref<MedicationEventDraft[]>([])
const recordPreviewVisible = ref(false)
const recordReasonOptions = ['病情较重', '多重用药', '用药方案复杂', '重大用药调整', '既往严重不良反应', '家庭用药不清', '依从性问题', '肝肾功能异常', '药师认为需要重点跟踪', '其他']
const interviewSourceOptions = ['患者本人', '家属', '药品包装或照片', '既往处方', '其他']
const medicationEventTypes = [{ value: 'add', label: '新增' }, { value: 'stop', label: '停用' }, { value: 'change', label: '更换' }, { value: 'adjust', label: '调整用法' }]
const currentPath = computed(() => route.path)
const isRetrospective = computed(() => currentPath.value.endsWith('retrospective'))
const isRecord = computed(() => currentPath.value.endsWith('records'))
const isEducation = computed(() => currentPath.value.endsWith('education'))
const educationReady = computed(() => isPreview && flow.isReady && flow.worklist.length > 0)
const retrospectiveData = computed(() => isPreview ? retrospectiveFixture : null)
const moduleTitle = computed(() => isRetrospective.value ? '处方点评' : isRecord.value ? '重点患者药历' : isEducation.value ? '用药教育' : '处方审核')
const mainTitle = computed(() => isRetrospective.value ? '出院后回顾性用药合理性分析' : isRecord.value ? '药历草稿与自动导入事实' : '患者任务与审核内容')
const moduleDescription = computed(() => isRetrospective.value ? '结合医院历史医嘱与出院后自购药记录，逐条评价用药合理性并生成可审阅报告。' : isRecord.value ? '药师主动选择重点患者，自动导入事实并补充临床访谈。' : isEducation.value ? '与药历独立管理，面向患者输出可审核的教育内容。' : '按科室查看当日未审核医嘱，单医嘱与联合用药分别审查。')
const dataSourceLabel = computed(() => isRetrospective.value ? (retrospectiveData.value?.sourceLabel || '数据源：等待真实回顾 API') : flow.isReady ? `数据源：${flow.sourceName} · 仅用于验证` : '数据源：等待导入或生产 API')
const records = computed(() => flow.researchRecords)
const recordPatients = computed(() => isPreview ? flow.worklist : [])
const priorityRecordPatients = computed(() => recordPatients.value.filter(item => {
  const workbench = flow.getWorkbench(item.encounterId)
  return Boolean(workbench?.alerts.length || workbench?.missingInfo.length || workbench?.facts.some(fact => /过敏|不良反应|跨科室|用药/i.test(`${fact.type} ${fact.label}`)))
}))
const filteredRecordPatients = computed(() => recordPatientFilter.value === 'priority' ? priorityRecordPatients.value : recordPatients.value)
const completedRecordCount = computed(() => Object.values(recordDrafts.value).filter(draft => draft.saved).length)
const selectedRecordWorkbench = computed(() => selectedRecordEncounterId.value ? flow.getWorkbench(selectedRecordEncounterId.value) : undefined)
const selectedRecordItem = computed(() => recordPatients.value.find(item => item.encounterId === selectedRecordEncounterId.value))
const autoPatientFields = computed(() => {
  const workbench = selectedRecordWorkbench.value
  const item = selectedRecordItem.value
  if (!workbench || !item) return []
  return [
    { label: '姓名 / 标识', value: workbench.patient.displayName, source: '患者主档' },
    { label: '性别 / 年龄', value: `${workbench.patient.sex === 'F' ? '女' : workbench.patient.sex === 'M' ? '男' : '未标注'} · ${workbench.patient.age} 岁`, source: '患者主档' },
    { label: '住院号', value: workbench.patient.sourcePatientId, source: 'HIS' },
    { label: '当前科室', value: item.department, source: 'HIS' },
    { label: '当前就诊', value: workbench.encounter.encounterId, source: 'HIS' },
    { label: '当前诊断', value: workbench.encounter.diagnosis, source: 'EMR' }
  ]
})
const autoAllergySummary = computed(() => {
  const facts = selectedRecordWorkbench.value?.facts.filter(fact => /过敏|不良反应|adr/i.test(`${fact.type} ${fact.label}`)) ?? []
  return facts.length ? facts.map(fact => `${fact.label}：${fact.value}`).join('；') : '当前快照未返回确认过敏或严重不良反应记录'
})
const autoMedicationEventCount = computed(() => medicationEvents.value.filter(event => event.source === 'system').length)
const autoImportedCount = computed(() => autoPatientFields.value.length + (selectedRecordWorkbench.value?.facts.length ?? 0) + autoMedicationEventCount.value)
const recordFormStatus = computed(() => recordDraft.value.saved ? '草稿已保存' : recordCompletion.value ? '填写中' : '待开始')
const recordCompletion = computed(() => {
  const fields = [recordDraft.value.selectionReason, recordDraft.value.interviewSource, recordDraft.value.patientConcern, recordDraft.value.historySummary, recordDraft.value.homeMedicationNarrative, recordDraft.value.analysis, recordDraft.value.recommendation, recordDraft.value.communicationNote]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
})
const recordProgressItems = computed(() => [
  { label: '自动导入患者事实', done: Boolean(selectedRecordWorkbench.value), detail: `${autoImportedCount.value} 项已读取` },
  { label: '患者用药访谈', done: Boolean(recordDraft.value.homeMedicationNarrative), detail: recordDraft.value.homeMedicationNarrative ? '已补充' : '待药师询问' },
  { label: '用药变更记录', done: medicationEvents.value.length > autoMedicationEventCount.value, detail: `${medicationEvents.value.length} 条记录` },
  { label: '药师建议', done: Boolean(recordDraft.value.recommendation), detail: recordDraft.value.recommendation ? '已填写' : '待填写' },
  { label: '医生沟通', done: recordDraft.value.physicianDecision !== 'pending', detail: physicianDecisionLabel(recordDraft.value.physicianDecision) }
])
const hospitalRows = computed(() => retrospectiveData.value?.hospitalOrders || [])
const selfPurchasedRows = computed(() => retrospectiveData.value?.selfPurchasedMeds || [])
const reviewRows = computed(() => [...hospitalRows.value, ...selfPurchasedRows.value])
const filteredReviewRows = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return reviewRows.value.filter((row) => {
    const sourceMatch = reviewFilter.value === 'all' || row.source === reviewFilter.value
    const keywordMatch = !keyword || [row.drugName, row.indication, row.evidenceSnippet, assessmentLabel(row.assessment)].some((value) => value.toLowerCase().includes(keyword))
    return sourceMatch && keywordMatch
  })
})
const selectedReview = computed(() => selectedReviewId.value ? reviewRows.value.find((row) => row.id === selectedReviewId.value) : undefined)
const assessmentCounts = computed(() => reviewRows.value.reduce((counts, row) => { counts[row.assessment] += 1; return counts }, { reasonable: 0, suspected_unreasonable: 0, insufficient: 0 } as Record<ReviewAssessment, number>))
const issueRows = computed(() => reviewRows.value.filter((row) => row.assessment === 'suspected_unreasonable'))
const conflictRows = computed(() => reviewRows.value.filter((row) => row.source === 'self_purchased' && row.conflictWith?.length))
const flowSteps = computed(() => [{ label: '审核结论', done: Object.keys(flow.decisions).length > 0, detail: '医生/药师决策' }, { label: '治疗结局', done: Object.keys(flow.outcomes).length > 0, detail: '随访与不良事件' }, { label: '研究队列', done: flow.cohortBuilt, detail: '纳排标准与版本' }, { label: '报告与知识', done: flow.reportStatus !== 'not_started', detail: '审阅后发布' }])

const assessmentLabel = (value: ReviewAssessment) => ({ reasonable: '合理', suspected_unreasonable: '疑似不合理', insufficient: '信息不足' })[value]
const assessmentType = (value: ReviewAssessment) => ({ reasonable: 'success', suspected_unreasonable: 'danger', insufficient: 'warning' })[value] as 'success' | 'danger' | 'warning'
const riskLabel = (value: ReviewRisk) => ({ high: '高', medium: '中', low: '低' })[value]
const riskType = (value: ReviewRisk) => ({ high: 'danger', medium: 'warning', low: 'info' })[value] as 'danger' | 'warning' | 'info'
const sourceLabel = (value: ReviewSource) => value === 'hospital' ? '医院医嘱' : '患者自购'
const homeMedicationLabel = (value: RecordDraft['homeMedicationStatus']) => ({ yes: '是', no: '否', unknown: '不清楚' })[value]
const adherenceLabel = (value: RecordDraft['adherence']) => ({ good: '基本按时', occasional: '偶尔漏服', poor: '经常漏服', unknown: '不清楚' })[value]
const medicationEventLabel = (value: string) => medicationEventTypes.find(item => item.value === value)?.label ?? value

function runAnalysis() {
  if (!isPreview) { errorMessage.value = '处方点评生产接口尚未接入，当前不会生成假分析结果。'; return }
  reportReady.value = true
  flow.analysisStatus = 'succeeded'
  errorMessage.value = '点评报告已根据当前导入记录生成，结论仍需药师审阅。'
}
function recordPatientStatus(encounterId: string) {
  const workbench = flow.getWorkbench(encounterId)
  if (workbench?.alerts.some(alert => alert.blocking)) return '硬阻断'
  if (workbench?.alerts.length || workbench?.missingInfo.length) return '需重点关注'
  return '可选择'
}
function recordPatientType(encounterId: string) {
  return recordPatientStatus(encounterId) === '硬阻断' ? 'danger' : recordPatientStatus(encounterId) === '需重点关注' ? 'warning' : 'info'
}
function recordPatientReason(encounterId: string) {
  const workbench = flow.getWorkbench(encounterId)
  if (workbench?.alerts.some(alert => alert.blocking)) return '存在硬阻断或严重风险'
  if (workbench?.missingInfo.length) return '关键信息缺失'
  if (workbench?.facts.some(fact => /过敏|不良反应|跨科室|用药/i.test(`${fact.type} ${fact.label}`))) return '用药情况需要药师访谈'
  return '待药师筛选'
}
function physicianDecisionLabel(value: PhysicianDecision) {
  return ({ pending: '待沟通', accepted: '已采纳', modified: '修改后执行', rejected: '不采纳', deferred: '暂不处理' } as Record<PhysicianDecision, string>)[value]
}
function buildAutoMedicationEvents(encounterId: string) {
  const workbench = flow.getWorkbench(encounterId)
  return (workbench?.facts.filter(fact => /medication|order|用药|医嘱/i.test(`${fact.type} ${fact.label}`)) ?? []).map((fact, index) => ({ id: `AUTO-${encounterId}-${index + 1}`, eventDate: fact.collectedAt.slice(0, 10), eventType: 'add', drugName: fact.value, regimen: '接口未返回完整用法', reason: '系统导入当前用药事实', source: 'system' as const }))
}
function saveCurrentRecordState() {
  if (!selectedRecordEncounterId.value) return
  recordDrafts.value[selectedRecordEncounterId.value] = JSON.parse(JSON.stringify(recordDraft.value)) as RecordDraft
  recordEvents.value[selectedRecordEncounterId.value] = JSON.parse(JSON.stringify(medicationEvents.value)) as MedicationEventDraft[]
}
type RecordExportFormat = 'docx' | 'pdf'
function handleRecordExport(command: string | number | object) {
  const format = String(command)
  if (format === 'docx' || format === 'pdf') void exportRecord(format)
}
function downloadRecordBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
function escapePrintHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}
function buildRecordPrintHtml() {
  const workbench = selectedRecordWorkbench.value
  if (!workbench) return ''
  const fieldHtml = autoPatientFields.value.map(field => `<div><strong>${escapePrintHtml(field.label)}</strong><span>${escapePrintHtml(field.value || '未返回')}</span></div>`).join('')
  const eventHtml = medicationEvents.value.length ? medicationEvents.value.map(event => `<tr><td>${escapePrintHtml(event.eventDate || '未填写')}</td><td>${escapePrintHtml(medicationEventLabel(event.eventType))}</td><td>${escapePrintHtml(event.drugName || '未填写')}</td><td>${escapePrintHtml(event.regimen || '未填写')}</td><td>${escapePrintHtml(event.reason || '未填写')}</td><td>${escapePrintHtml(event.source === 'system' ? '系统导入' : '药师填写')}</td></tr>`).join('') : '<tr><td colspan="6">暂无用药变更记录</td></tr>'
  const paragraph = (label: string, value: unknown) => `<div class="line"><strong>${escapePrintHtml(label)}</strong><span>${escapePrintHtml(value || '未填写')}</span></div>`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapePrintHtml(workbench.patient.displayName)} 药历</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#294b53;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;font-size:12px;line-height:1.55}h1{margin:0 0 4px;color:#173e47;font-size:24px}h2{margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid #286f69;color:#294d55;font-size:15px}.meta{margin-bottom:16px;color:#718187}.facts{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #dfe8e9;border-left:1px solid #dfe8e9}.facts div{display:grid;gap:3px;padding:8px;border-right:1px solid #dfe8e9;border-bottom:1px solid #dfe8e9}.facts strong,.line strong{color:#6a7d82;font-size:10px}.facts span,.line span{white-space:pre-wrap}.line{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;padding:7px 0;border-bottom:1px solid #e7edef}.line:last-child{border-bottom:0}table{width:100%;border-collapse:collapse;page-break-inside:avoid}th,td{padding:7px;border:1px solid #dfe8e9;text-align:left;vertical-align:top;word-break:break-word}th{background:#f5f8f8;color:#6e8085;font-size:10px}td{font-size:11px}.notice{margin-top:16px;color:#7d8d92;font-size:10px}@media print{h2{break-after:avoid}.facts,table,.line{break-inside:avoid}}</style></head><body><h1>${escapePrintHtml(workbench.patient.displayName)} 药历</h1><div class="meta">${escapePrintHtml(workbench.encounter.department)} · ${escapePrintHtml(workbench.encounter.diagnosis)} · 当前就诊 ${escapePrintHtml(workbench.encounter.encounterId)}</div><h2>一、患者基本信息</h2><div class="facts">${fieldHtml}</div><h2>二、建立药历与患者关注点</h2>${paragraph('建立原因', recordDraft.value.selectionReason)}${paragraph('访谈来源', recordDraft.value.interviewSource)}${paragraph('患者关注点', recordDraft.value.patientConcern)}<h2>三、病史、家族史与安全摘要</h2>${paragraph('当前诊断', workbench.encounter.diagnosis)}${paragraph('过敏 / 不良反应', autoAllergySummary.value)}${paragraph('既往病史 / 家族史', recordDraft.value.historySummary)}<h2>四、患者家庭用药访谈</h2>${paragraph('是否长期服药', homeMedicationLabel(recordDraft.value.homeMedicationStatus))}${paragraph('用药依从性', adherenceLabel(recordDraft.value.adherence))}${paragraph('家庭药物及不良反应', recordDraft.value.homeMedicationNarrative)}<h2>五、住院期间用药与变更记录</h2><table><thead><tr><th>时间</th><th>变更</th><th>药品</th><th>用法用量</th><th>调整原因 / 记录</th><th>来源</th></tr></thead><tbody>${eventHtml}</tbody></table><h2>六、药师用药分析与建议</h2>${paragraph('方案分析', recordDraft.value.analysis)}${paragraph('药师建议', recordDraft.value.recommendation)}<h2>七、查房沟通与医生处理结果</h2>${paragraph('处理结果', physicianDecisionLabel(recordDraft.value.physicianDecision))}${paragraph('沟通日期', recordDraft.value.communicationDate)}${paragraph('沟通记录 / 医生反馈', recordDraft.value.communicationNote)}<div class="notice">本文件由当前前端药历草稿生成，正式临床使用前须经过医院系统审核。</div></body></html>`
}
function exportRecordPdf() {
  const printWindow = window.open('', '_blank', 'width=1100,height=900')
  if (!printWindow) { errorMessage.value = 'PDF 导出窗口被浏览器拦截，请允许本站打开新窗口后重试。'; return }
  printWindow.opener = null
  printWindow.document.write(buildRecordPrintHtml())
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close() }, 350)
  errorMessage.value = '已打开 PDF 打印预览，请在打印目标中选择“另存为 PDF”。'
}
async function exportRecord(format: RecordExportFormat) {
  if (!selectedRecordEncounterId.value || !selectedRecordWorkbench.value) { errorMessage.value = '请先选择一名患者，再导出药历。'; return }
  saveCurrentRecordState()
  if (format === 'pdf') { exportRecordPdf(); return }
  try {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx')
    const workbench = selectedRecordWorkbench.value
    const textParagraph = (label: string, value: unknown) => new Paragraph({ children: [new TextRun({ text: `${label}：`, bold: true }), new TextRun(String(value || '未填写'))] })
    const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
    const tableRows = [
      ['时间', '变更', '药品', '用法用量', '调整原因 / 记录', '来源'],
      ...medicationEvents.value.map(event => [event.eventDate || '未填写', medicationEventLabel(event.eventType), event.drugName || '未填写', event.regimen || '未填写', event.reason || '未填写', event.source === 'system' ? '系统导入' : '药师填写'])
    ].map((row, rowIndex) => new TableRow({ children: row.map(value => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold: rowIndex === 0 })] })] })) }))
    const children = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${workbench.patient.displayName} 药历`, bold: true, size: 32 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${workbench.encounter.department} · ${workbench.encounter.diagnosis} · ${workbench.encounter.encounterId}`)] }),
      heading('一、患者基本信息'),
      ...autoPatientFields.value.map(field => textParagraph(field.label, field.value || '未返回')),
      heading('二、建立药历与患者关注点'), textParagraph('建立原因', recordDraft.value.selectionReason), textParagraph('访谈来源', recordDraft.value.interviewSource), textParagraph('患者关注点', recordDraft.value.patientConcern),
      heading('三、病史、家族史与安全摘要'), textParagraph('当前诊断', workbench.encounter.diagnosis), textParagraph('过敏 / 不良反应', autoAllergySummary.value), textParagraph('既往病史 / 家族史', recordDraft.value.historySummary),
      heading('四、患者家庭用药访谈'), textParagraph('是否长期服药', homeMedicationLabel(recordDraft.value.homeMedicationStatus)), textParagraph('用药依从性', adherenceLabel(recordDraft.value.adherence)), textParagraph('家庭药物及不良反应', recordDraft.value.homeMedicationNarrative),
      heading('五、住院期间用药与变更记录'), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      heading('六、药师用药分析与建议'), textParagraph('方案分析', recordDraft.value.analysis), textParagraph('药师建议', recordDraft.value.recommendation),
      heading('七、查房沟通与医生处理结果'), textParagraph('处理结果', physicianDecisionLabel(recordDraft.value.physicianDecision)), textParagraph('沟通日期', recordDraft.value.communicationDate), textParagraph('沟通记录 / 医生反馈', recordDraft.value.communicationNote),
      new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: '本文件由当前前端药历草稿生成，正式临床使用前须经过医院系统审核。', italics: true, color: '7D8D92' })] })
    ]
    const blob = await Packer.toBlob(new Document({ sections: [{ properties: {}, children }] }))
    downloadRecordBlob(blob, `medication-record-${selectedRecordEncounterId.value}-v1.docx`)
    errorMessage.value = 'Word 药历已导出。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? `Word 导出失败：${error.message}` : 'Word 导出失败，请重试。'
  }
}
function selectRecordPatient(encounterId: string) {
  saveCurrentRecordState()
  selectedRecordEncounterId.value = encounterId
  recordDraft.value = JSON.parse(JSON.stringify(recordDrafts.value[encounterId] ?? emptyRecordDraft())) as RecordDraft
  medicationEvents.value = JSON.parse(JSON.stringify(recordEvents.value[encounterId] ?? buildAutoMedicationEvents(encounterId))) as MedicationEventDraft[]
}
function addMedicationEvent() {
  medicationEvents.value.push({ id: `PHARM-${Date.now()}`, eventDate: new Date().toISOString().slice(0, 10), eventType: 'change', drugName: '', regimen: '', reason: '', source: 'pharmacist' })
}
function createRecord() {
  if (!isPreview) { errorMessage.value = '药历生产接口尚未接入，当前不会创建假草稿。'; return }
  if (!selectedRecordEncounterId.value && filteredRecordPatients.value[0]) selectRecordPatient(filteredRecordPatients.value[0].encounterId)
  errorMessage.value = '已进入药历模板，系统事实已自动导入；请补充患者访谈和药品变更记录。'
}
function saveRecord() {
  if (!isPreview) { errorMessage.value = '药历生产接口尚未接入，当前不会写入假数据。'; return }
  if (selectedRecordEncounterId.value) recordDraft.value.saved = true
  saveCurrentRecordState()
  errorMessage.value = `药历草稿已保存；医生建议状态：${physicianDecisionLabel(recordDraft.value.physicianDecision)}。`
}
async function generateEducation() {
  const workbench = selectedEducationWorkbench.value
  if (!workbench) { errorMessage.value = '请先选择教育患者。'; return }
  educationGenerating.value = true
  errorMessage.value = ''
  try {
    const draft = await generateMedicationEducation({
      patient: {
        age: workbench.patient.age,
        sex: workbench.patient.sex,
        department: workbench.encounter.department,
        diagnosis: workbench.encounter.diagnosis,
        medications: educationMedicationFacts.value.map(fact => fact.label + ': ' + fact.value),
        allergies: educationSafetyFacts.value.filter(fact => /allergy|过敏/i.test(fact.type + ' ' + fact.label)).map(fact => fact.value),
        adverseReactions: educationSafetyFacts.value.filter(fact => /adverse|不良反应|adr/i.test(fact.type + ' ' + fact.label)).map(fact => fact.value),
        missingInfo: educationMissingInfo.value
      },
      profile: {
        category: educationCategories.find(item => item.value === educationProfile.value.category)?.label ?? educationProfile.value.category,
        literacy: educationProfile.value.literacy,
        communication: educationProfile.value.communication,
        caregiver: educationProfile.value.caregiver,
        adherenceRisk: educationProfile.value.adherenceRisk,
        goals: educationGoals.value,
        notes: educationProfile.value.notes
      }
    })
    educationText.value = draft.content
    educationGeneratedBy.value = draft.provider
    errorMessage.value = draft.provider === 'deepseek'
      ? '已生成 DeepSeek 可编辑教育草稿，提交前请核对患者事实和用药方案。'
      : '当前未配置有效 DeepSeek 密钥，已使用本地规则草稿打通流程；提交前请核对患者事实和用药方案。'
  } catch (error) {
    educationGeneratedBy.value = ''
    errorMessage.value = error instanceof Error ? error.message : '教育草稿生成失败，请检查本地 DeepSeek 代理。'
  } finally {
    educationGenerating.value = false
  }
}
function publishEducation() {
  if (!educationText.value.trim()) { errorMessage.value = '请先填写或生成教育内容。'; return }
  errorMessage.value = isPreview ? '教育内容已生成待药师审核任务，未直接发送给患者。' : '用药教育生产接口尚未接入，当前不会发送或保存假任务。'
}

onMounted(async () => {
  if (isPreview) {
    await flow.ensureScenario()
    if (!selectedRecordEncounterId.value && filteredRecordPatients.value[0]) selectRecordPatient(filteredRecordPatients.value[0].encounterId)
    if (!educationEncounterId.value && educationPatients.value[0]) educationEncounterId.value = educationPatients.value[0].encounterId
  }
})
watch(() => flow.revision, () => {
  if (!flow.isReady) return
  if (isRecord.value && !selectedRecordEncounterId.value && filteredRecordPatients.value[0]) selectRecordPatient(filteredRecordPatients.value[0].encounterId)
  if (isEducation.value && !educationEncounterId.value && educationPatients.value[0]) educationEncounterId.value = educationPatients.value[0].encounterId
})
</script>

<style scoped>
.pharmacy-module-page{padding-bottom:28px}.module-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px;transition:grid-template-columns 160ms ease}.module-grid.side-collapsed{grid-template-columns:minmax(0,1fr)}.module-main{min-width:0;min-height:520px}.module-main>.surface-panel-header{padding:0 16px}.module-heading{min-width:0;display:grid;gap:3px}.module-heading h2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.module-header-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.focus-button{color:#587078}
.retrospective-layout{padding:16px;display:grid;gap:14px}.retrospective-patient{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 18px;background:#f4f8f7;border:1px solid #dce8e6}.patient-identity{display:flex;align-items:center;gap:12px;min-width:220px}.patient-avatar,.record-avatar{display:grid;place-items:center;background:#dceee9;color:#126b66;font-weight:800}.patient-avatar{width:42px;height:42px;border-radius:7px;font-size:17px}.patient-identity div:last-child{display:grid;gap:4px}.patient-identity strong{font-size:16px;color:#173d45}.patient-identity span{font-size:11px;color:#6c7d83}.patient-facts{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:18px;flex:1;margin:0}.patient-facts div,.detail-facts div{min-width:0}.patient-facts dt,.detail-facts dt{color:#7a8b90;font-size:10px}.patient-facts dd,.detail-facts dd{margin:5px 0 0;color:#29464d;font-size:12px;line-height:1.45}.review-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.review-kpi-grid>div{min-width:0;padding:12px 14px;border:1px solid #dfe8e9;background:#fff}.review-kpi-grid strong,.review-kpi-grid span,.review-kpi-grid small{display:block}.review-kpi-grid strong{font-size:22px;line-height:1;color:#143e47}.review-kpi-grid span{margin-top:7px;color:#465f66;font-size:11px;font-weight:700}.review-kpi-grid small{margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#89979b;font-size:10px}.review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #e4ebec;border-bottom:1px solid #e4ebec}.review-toolbar .el-input{width:230px}.review-workspace{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:12px;align-items:start}.review-table-panel{min-width:0;border:1px solid #dce5e7;background:#fff}.table-caption{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e4eaeb}.table-caption strong{color:#274951;font-size:13px}.table-caption span{color:#879599;font-size:10px}.review-table-scroll{overflow-x:auto}.review-table,.report-table{width:100%;border-collapse:collapse}.review-table{min-width:930px}.review-table th,.review-table td,.report-table th,.report-table td{padding:11px 10px;text-align:left;border-bottom:1px solid #e7edef;vertical-align:top}.review-table th,.report-table th{background:#f7f9f9;color:#718187;font-size:10px;font-weight:700;white-space:nowrap}.review-table td,.report-table td{color:#415a60;font-size:11px;line-height:1.45}.review-table tbody tr{cursor:pointer;transition:background 120ms ease}.review-table tbody tr:hover,.review-table tbody tr.selected{background:#f0f8f6}.review-table td small,.review-table td strong{display:block}.review-table td small{margin-top:3px;color:#89979b;font-size:10px}.drug-name{color:#173e47;font-size:12px}.source-label{display:inline-block;padding:3px 6px;font-size:10px;white-space:nowrap}.source-label.hospital{background:#edf3f5;color:#50717a}.source-label.self_purchased{background:#fff4e5;color:#a46a19}.table-action{padding:0;border:0;background:none;color:#13716b;font-size:11px;cursor:pointer;white-space:nowrap}.table-action:hover{text-decoration:underline}.empty-cell{padding:40px!important;text-align:center!important;color:#879599!important}.review-detail-panel{display:grid;gap:14px;padding:16px;border:1px solid #d6e4e2;background:#fbfdfc}.detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e3ebea;padding-bottom:12px}.detail-header h3{margin:4px 0 0;color:#173e47;font-size:18px}.detail-facts{display:grid;gap:10px;margin:0}.detail-block{padding-top:12px;border-top:1px solid #e3ebea}.detail-block h4{margin:0 0 8px;color:#35575e;font-size:12px}.detail-block p{margin:0;color:#4d646a;font-size:11px;line-height:1.6}.detail-block ul{display:grid;gap:6px;margin:0;padding-left:17px;color:#4d646a;font-size:11px;line-height:1.55}.evidence-snippet{margin-top:9px!important;padding:9px;background:#f3f8f7;color:#35645f!important}.conflict-block{border-top-color:#efd7ab}.conflict-block h4{color:#a46a19}.conflict-block small{display:block;margin-top:7px;color:#9b7b4b;font-size:10px;line-height:1.5}.detail-boundary{padding:8px;background:#f7f8f8;color:#829095;font-size:10px;line-height:1.5}.review-detail-empty{display:grid;place-items:center;align-content:center;gap:8px;min-height:250px;padding:24px;border:1px dashed #cfdbdd;color:#7d8d92;text-align:center}.review-detail-empty strong{color:#49636a;font-size:12px}.review-detail-empty span{font-size:10px;line-height:1.5}.report-panel{border-top:2px solid #286f69;padding-top:16px}.report-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.report-header h3{margin:4px 0 0;color:#173e47;font-size:17px}.report-version{color:#7e8d92;font-size:10px}.report-section{margin-top:18px}.report-section h4{margin:0 0 9px;color:#2f555c;font-size:13px}.report-section p{margin:0 0 8px;color:#4b6268;font-size:11px;line-height:1.65}.report-boundary{padding:10px;background:#f6f8f8;color:#76858a!important}.report-table th,.report-table td{padding:9px}.report-table{border:1px solid #e0e8e9}.report-table td strong{color:#244a52}.issue-item{padding:12px 14px;border-left:3px solid #c87934;background:#fffaf3}.issue-item+.issue-item{margin-top:8px}.issue-title{display:flex;justify-content:space-between;gap:10px}.issue-title strong{color:#7d4d1e;font-size:12px}.issue-item dl{display:grid;gap:7px;margin:10px 0 0}.issue-item dl div{display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px}.issue-item dt{color:#a37a4c;font-size:10px}.issue-item dd{margin:0;color:#5a5f5c;font-size:11px;line-height:1.55}.conflict-report{padding:12px 14px;background:#fff8ec;border-left:3px solid #d28b2e}.missing-list{display:grid;gap:6px;margin:0;padding-left:18px;color:#566b71;font-size:11px;line-height:1.6}.report-not-ready{display:flex;align-items:center;gap:8px;padding:12px;background:#f3f8f7;color:#47736d;font-size:11px}.module-empty{display:grid;place-items:center;align-content:center;gap:7px;min-height:170px;padding:20px;color:#6d7e86;text-align:center}.module-empty svg{color:#6a9c97}.module-empty strong{color:#38545e;font-size:11px}.module-empty span{max-width:470px;font-size:9px;line-height:1.5}.page-empty{min-height:340px}
.record-layout,.education-layout{padding:16px}.record-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid #e0e6e8}.record-row>div:nth-child(2){min-width:0;display:grid;gap:3px}.record-row strong,.record-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-row strong{font-size:10px}.record-row span{color:#75848a;font-size:9px}.record-avatar{width:28px;height:28px;border-radius:5px;font-size:10px}.manual-block{display:grid;gap:9px;margin-top:18px;padding-top:14px;border-top:1px solid #dce5e7}.manual-block strong{font-size:11px}.manual-actions,.education-patient{display:flex;align-items:center;justify-content:space-between;gap:10px}.education-layout{display:grid;gap:12px}.education-patient{padding:12px;background:#f3f7f7}.education-patient>div:nth-child(2){flex:1;display:grid;gap:3px;min-width:0}.education-patient strong,.education-patient span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.education-patient strong{font-size:11px}.education-patient span{color:#75848a;font-size:9px}.education-checks{display:flex;flex-wrap:wrap;gap:12px}.module-side{display:grid;align-content:start;gap:12px}.flow-steps{display:grid;padding:8px 14px 14px}.flow-steps>div{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:9px 0;border-bottom:1px solid #e4eaeb}.flow-steps>div:last-child{border-bottom:0}.flow-steps>div>span{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#eef1f2;color:#839198;font-size:11px}.flow-steps>div.done>span{background:#e2f1eb;color:#16745b}.flow-steps strong,.flow-steps small{display:block}.flow-steps strong{font-size:10px}.flow-steps small{margin-top:3px;color:#7b898e;font-size:8px}.safety-mini ul{margin:0;padding:12px 28px 16px;color:#61727a;font-size:9px;line-height:2}
.record-selection-bar{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:14px 0 16px;border-bottom:1px solid #e4ebec}.record-selection-bar h3{margin:3px 0 4px;color:#173e47;font-size:16px;line-height:1.35}.record-selection-bar p{margin:0;color:#718187;font-size:11px}.record-selection-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.record-workspace{display:grid;grid-template-columns:235px minmax(0,1fr);gap:12px;align-items:start;padding-top:12px}.record-patient-list{min-width:0;overflow:hidden;border:1px solid #dce6e7;background:#fbfdfd}.record-list-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 12px 10px;border-bottom:1px solid #e4ebec}.record-list-header strong{color:#2d5058;font-size:12px}.record-list-header span{color:#829196;font-size:10px}.record-patient-item{width:100%;display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:start;gap:8px;padding:11px 10px;border:0;border-bottom:1px solid #e8eeef;background:#fff;color:inherit;text-align:left;cursor:pointer}.record-patient-item:last-of-type{border-bottom:0}.record-patient-item:hover,.record-patient-item.selected{background:#eff8f5}.record-patient-item.selected{box-shadow:inset 3px 0 #16766f}.record-patient-item>span:nth-child(2){min-width:0;display:grid;gap:3px}.record-patient-item strong,.record-patient-item small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-patient-item strong{color:#244951;font-size:11px}.record-patient-item small{color:#75858b;font-size:9px}.record-patient-item small:last-child{color:#a26c22}.record-patient-item .el-tag{margin-top:1px}.record-list-empty{padding:28px 14px;color:#839196;font-size:10px;line-height:1.5;text-align:center}.record-template{min-width:0;border:1px solid #dce6e7;background:#fff}.record-template-empty{border:1px solid #dce6e7;background:#fbfdfd}.record-document-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px;border-bottom:2px solid #286f69;background:#fbfdfd}.record-document-header h3{margin:4px 0 5px;color:#173e47;font-size:18px;line-height:1.3}.record-document-header p{margin:0;color:#718187;font-size:11px;line-height:1.5}.record-document-status{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap;color:#728288;font-size:10px}.record-template-section{padding:15px 16px;border-bottom:1px solid #e5ecec}.record-template-section:last-child{border-bottom:0}.record-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.record-section-heading>div{display:flex;align-items:center;gap:8px;min-width:0}.record-section-heading>div>span{display:grid;place-items:center;width:24px;height:20px;background:#e8f3f1;color:#14736c;font-size:10px;font-weight:800}.record-section-heading h4{margin:0;color:#294d55;font-size:13px;line-height:1.4}.record-section-heading>.el-button{margin-left:4px}.record-section-heading>div:last-child{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.record-field-table{border-top:1px solid #dfe8e9;border-left:1px solid #dfe8e9}.record-field-row{display:grid;grid-template-columns:100px minmax(0,1fr) 72px;min-height:39px;border-bottom:1px solid #dfe8e9}.record-field-row>*{display:flex;align-items:center;min-width:0;padding:8px 10px;border-right:1px solid #dfe8e9}.record-field-row strong{background:#f7f9f9;color:#5b7076;font-size:10px;font-weight:700}.record-field-row span{color:#294b53;font-size:12px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-field-row small{justify-content:center;color:#7d8d92;font-size:9px;white-space:nowrap}.record-form-grid,.record-interview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.record-form-grid label,.record-interview-grid label,.record-fact-panels label{display:grid;gap:6px;min-width:0}.record-form-grid label>span,.record-interview-grid label>span,.record-fact-panels label>span{color:#5c7278;font-size:10px;font-weight:700}.field-wide{grid-column:1/-1}.record-fact-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.record-fact-panels article{min-width:0;padding:12px;border:1px solid #e1e9ea;background:#f7faf9}.record-fact-panels article strong{display:block;color:#4d686f;font-size:10px}.record-fact-panels article p{min-height:35px;margin:7px 0;color:#294b53;font-size:12px;line-height:1.5}.record-fact-panels article small{color:#89979b;font-size:9px}.record-fact-panels label{grid-column:1/-1}.medication-event-table{overflow-x:auto;border:1px solid #dce5e7}.medication-event-row{display:grid;grid-template-columns:106px 92px minmax(140px,1fr) minmax(160px,1.2fr) minmax(170px,1.2fr) 64px;gap:0;min-width:880px;align-items:center;border-bottom:1px solid #e4eaeb}.medication-event-row:last-child{border-bottom:0}.medication-event-row>*{min-width:0;padding:7px;border-right:1px solid #e4eaeb}.medication-event-row>*:last-child{border-right:0}.medication-event-row.event-head{min-height:34px;background:#f5f8f8;color:#6e8085;font-size:10px;font-weight:700}.medication-event-row:not(.event-head)>*{min-height:42px;display:flex;align-items:center}.medication-event-row .el-date-editor,.medication-event-row .el-select,.medication-event-row .el-input{width:100%}.event-source{justify-content:center;color:#7d8b90;font-size:9px;white-space:nowrap}.event-source.system{color:#28776f}.event-source.pharmacist{color:#a26c22}.record-table-empty{min-width:880px;padding:28px;color:#839196;font-size:10px;text-align:center}.collaboration-section{background:#fffaf0;border-top:1px solid #efd9ad}.record-progress-panel .surface-panel-header{align-items:center}.record-progress-bar{height:5px;margin:0 14px 4px;background:#e7eeee;overflow:hidden}.record-progress-bar span{display:block;height:100%;background:#267d73;transition:width 180ms ease}.record-progress-panel ul{display:grid;gap:0;margin:0;padding:7px 14px 12px;list-style:none}.record-progress-panel li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:7px;padding:8px 0;border-bottom:1px solid #e5ebec}.record-progress-panel li:last-child{border-bottom:0}.record-progress-panel li>span{color:#9aa7aa;font-size:12px}.record-progress-panel li.done>span{color:#16745b}.record-progress-panel li strong,.record-progress-panel li small{display:block}.record-progress-panel li strong{color:#4c686e;font-size:10px}.record-progress-panel li small{margin-top:2px;color:#829095;font-size:9px;line-height:1.45}.record-billing-panel p{margin:0;padding:12px 14px 4px;color:#65787d;font-size:10px;line-height:1.55}.record-billing-panel>span{display:block;padding:0 14px 14px;color:#a26c22;font-size:10px}
.record-preview-dialog :deep(.el-dialog__body){padding:0 22px 18px;background:#f4f7f7}.record-preview-document{border:1px solid #d9e3e4;background:#fff;color:#334e55}.record-preview-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px;border-bottom:2px solid #286f69}.record-preview-header h2{margin:5px 0;color:#173e47;font-size:22px}.record-preview-header p{margin:0;color:#718187;font-size:12px}.record-preview-header>div:last-child{display:grid;justify-items:end;gap:7px}.record-preview-header small{color:#7d8d92;font-size:10px}.record-preview-section{padding:16px 20px;border-bottom:1px solid #dfe8e9}.record-preview-section:last-child{border-bottom:0}.record-preview-section h3{margin:0 0 11px;color:#294d55;font-size:14px}.record-preview-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #dfe8e9;border-left:1px solid #dfe8e9}.record-preview-facts>div{display:grid;gap:5px;min-height:48px;padding:9px 11px;border-right:1px solid #dfe8e9;border-bottom:1px solid #dfe8e9}.record-preview-facts strong,.record-preview-dl dt{color:#6a7d82;font-size:10px}.record-preview-facts span,.record-preview-dl dd{margin:0;color:#294b53;font-size:12px;line-height:1.55}.record-preview-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;margin:0;border-top:1px solid #dfe8e9;border-left:1px solid #dfe8e9}.record-preview-dl>div{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;min-width:0;padding:10px;border-right:1px solid #dfe8e9;border-bottom:1px solid #dfe8e9}.record-preview-dl>div.wide{grid-column:1/-1}.record-preview-dl dd{overflow-wrap:anywhere}.record-preview-table{width:100%;border-collapse:collapse;border:1px solid #dfe8e9}.record-preview-table th,.record-preview-table td{padding:9px 10px;border-bottom:1px solid #e3eaeb;text-align:left;vertical-align:top;font-size:11px;line-height:1.5}.record-preview-table th{background:#f5f8f8;color:#6e8085;font-size:10px}.record-preview-table td{color:#294b53}.record-preview-table tr:last-child td{border-bottom:0}.record-preview-empty{padding:52px;text-align:center;color:#7d8d92;font-size:12px}
.module-side{display:grid;align-content:start;gap:12px}.flow-steps{display:grid;padding:8px 14px 14px}.flow-steps>div{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:9px 0;border-bottom:1px solid #e4eaeb}.flow-steps>div:last-child{border-bottom:0}.flow-steps>div>span{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#eef1f2;color:#839198;font-size:11px}.flow-steps>div.done>span{background:#e2f1eb;color:#16745b}.flow-steps strong,.flow-steps small{display:block}.flow-steps strong{font-size:10px}.flow-steps small{margin-top:3px;color:#7b898e;font-size:8px}.safety-mini ul{margin:0;padding:12px 28px 16px;color:#61727a;font-size:9px;line-height:2}
.education-patient-bar,.education-mode-bar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;border-bottom:1px solid #e3eaeb;background:#fff}.education-patient-identity,.education-patient-controls,.education-mode-bar>div,.education-section-heading>div{display:flex;align-items:center;gap:11px}.education-patient-identity>div{display:grid;gap:4px;min-width:0}.education-patient-identity strong{color:#173f48;font-size:14px}.education-patient-identity span{color:#74858a;font-size:11px}.education-patient-controls{flex-wrap:wrap;justify-content:flex-end}.education-patient-controls .el-select{width:230px}.education-mode-bar{align-items:flex-start;background:#f8fbfb}.education-mode-bar h3,.education-section-heading h3{margin:3px 0 4px;color:#23464e;font-size:15px}.education-mode-bar p,.education-section-heading p{margin:0;color:#78888d;font-size:11px;line-height:1.5}.education-workspace{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px;padding:18px}.education-editor-panel,.education-side-panel{min-width:0}.education-editor-panel{display:grid;gap:16px}.education-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.education-step{display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;border-radius:50%;background:#e7f3ef;color:#1d7666;font-size:11px;font-weight:700}.education-section-heading>div>div{display:grid;gap:1px}.education-goals{display:flex;flex-wrap:wrap;gap:5px 16px;padding:11px 0;border-bottom:1px solid #e3eaeb}.education-goals .el-checkbox{margin-right:0}.education-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px}.education-profile-grid label{display:grid;gap:6px;min-width:0}.education-profile-grid label>span,.education-goal-heading span{color:#718187;font-size:11px}.education-profile-wide{grid-column:1/-1}.education-goal-heading{display:flex;align-items:center;justify-content:space-between;padding-top:2px}.education-goal-heading strong{color:#33555d;font-size:12px}.education-fact-table{overflow:hidden;border:1px solid #dfe8e9;background:#fff}.education-fact-header,.education-fact-row{display:grid;grid-template-columns:112px minmax(0,1fr) 92px;gap:12px;align-items:start;padding:10px 12px;border-bottom:1px solid #e7eeee}.education-fact-header{background:#f4f8f8;color:#4a696f;font-size:11px}.education-fact-header span{grid-column:2/-1;color:#859397;font-size:10px}.education-fact-row:last-child{border-bottom:0}.education-fact-row strong{color:#5d747a;font-size:10px}.education-fact-row span{color:#31535b;font-size:11px;line-height:1.45;overflow-wrap:anywhere}.education-fact-row small{color:#879599;font-size:9px;text-align:right}.education-safety-row{background:#fffaf2}.education-missing-row{background:#fff8f7}.education-fact-empty{padding:14px;color:#9a6b45;font-size:11px}.education-result-panel{display:grid;gap:12px;padding-top:16px;border-top:1px solid #dce6e7}.education-result-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.education-result-footer>span{display:flex;align-items:center;gap:6px;color:#7a898d;font-size:10px}.education-side-panel{align-self:start;padding-left:18px;border-left:1px solid #e1e9ea}.education-side-heading{display:flex;align-items:center;gap:7px;padding-bottom:12px;color:#315861;font-size:12px;border-bottom:1px solid #e1e9ea}.education-facts{display:grid;gap:0;margin:0}.education-facts>div{display:grid;gap:4px;padding:11px 0;border-bottom:1px solid #edf1f1}.education-facts dt{color:#839196;font-size:10px}.education-facts dd{margin:0;color:#365860;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.education-boundary{margin-top:16px;padding:12px;background:#f6f8f8}.education-boundary strong{color:#49676d;font-size:11px}.education-boundary p{margin:7px 0 0;color:#738388;font-size:10px;line-height:1.6}
@media(max-width:1280px){.module-grid{grid-template-columns:minmax(0,1fr) 230px}.module-side{font-size:9px}.review-workspace{grid-template-columns:minmax(0,1fr) 310px}.patient-facts{gap:10px}.record-workspace{grid-template-columns:210px minmax(0,1fr)}.record-document-header h3{font-size:16px}.medication-event-row{min-width:850px}}
@media(max-width:900px){.module-grid,.module-grid.side-collapsed{grid-template-columns:1fr}.module-side{display:none}.module-main>.surface-panel-header{align-items:flex-start;padding-top:10px;padding-bottom:10px}.module-header-actions{flex-wrap:wrap;justify-content:flex-end}.review-kpi-grid{grid-template-columns:repeat(2,1fr)}.retrospective-patient,.review-toolbar{align-items:flex-start;flex-direction:column}.patient-facts{width:100%;grid-template-columns:1fr}.review-toolbar .el-input{width:100%}.review-workspace{grid-template-columns:1fr}.review-detail-panel{order:-1}.report-header{align-items:flex-start;flex-direction:column}.manual-actions,.education-patient,.education-patient-bar,.education-mode-bar{align-items:flex-start;flex-direction:column}.education-patient-controls{width:100%;justify-content:flex-start}.education-patient-controls .el-select{width:100%}.education-workspace{grid-template-columns:1fr;padding:14px}.education-side-panel{padding:14px 0 0;border-top:1px solid #e1e9ea;border-left:0}.education-profile-grid{grid-template-columns:1fr}.education-profile-wide{grid-column:auto}.education-fact-row{grid-template-columns:86px minmax(0,1fr)}.education-fact-row small{grid-column:2;text-align:left}.education-result-footer{align-items:flex-start;flex-direction:column}.record-selection-bar,.record-document-header{align-items:flex-start;flex-direction:column}.record-selection-controls,.record-document-status{justify-content:flex-start}.record-workspace{grid-template-columns:1fr}.record-patient-list{max-height:280px;overflow-y:auto}.record-form-grid,.record-interview-grid,.record-fact-panels{grid-template-columns:1fr}.record-fact-panels label{grid-column:auto}.field-wide{grid-column:1}.record-document-header{gap:12px}.record-document-status{width:100%}.record-preview-facts,.record-preview-dl{grid-template-columns:1fr}.record-preview-dl>div.wide{grid-column:auto}}
</style>
