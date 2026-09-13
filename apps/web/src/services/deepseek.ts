export interface MedicationEducationRequest {
  patient: {
    age: number
    sex: string
    department: string
    diagnosis: string
    medications: string[]
    allergies: string[]
    adverseReactions: string[]
    missingInfo: string[]
  }
  profile: {
    category: string
    literacy: string
    communication: string
    caregiver: string
    adherenceRisk: string
    goals: string[]
    notes: string
  }
}

export interface MedicationEducationDraft {
  content: string
  provider: 'deepseek' | 'local-fallback'
}

function localFallbackDraft(request: MedicationEducationRequest): MedicationEducationDraft {
  const medicationLines = request.patient.medications.length
    ? request.patient.medications.map(item => '- ' + item).join('\n')
    : '- 当前接口未返回用药明细，药品名称、剂量和频次待确认'
  const safetyLines = [
    ...request.patient.allergies.map(item => '- 过敏事实：' + item),
    ...request.patient.adverseReactions.map(item => '- 不良反应事实：' + item),
    ...request.patient.missingInfo.map(item => '- 待确认：' + item)
  ]
  return {
    provider: 'local-fallback',
    content: [
      '【本地开发规则草稿｜未调用 DeepSeek】',
      '患者：' + request.patient.age + ' 岁，' + request.patient.sex + '，' + request.patient.department,
      '诊断：' + request.patient.diagnosis,
      '',
      '一、当前用药事实',
      medicationLines,
      '',
      '二、沟通重点',
      '患者类别：' + request.profile.category,
      '表达方式：' + request.profile.communication + '；执行主体：' + request.profile.caregiver,
      '依从性风险：' + request.profile.adherenceRisk,
      request.profile.notes ? '医师补充：' + request.profile.notes : '医师补充：暂无',
      '',
      '三、安全核对',
      safetyLines.length ? safetyLines.join('\n') : '- 当前未返回已确认过敏或不良反应事实',
      '',
      '四、执行提醒',
      '- 请按正式处方和药品说明核对每种药的用法，不得根据本草稿自行调整剂量或停药。',
      '- 出现未预期不适、过敏表现或病情变化时，及时联系医护人员。',
      '- 本草稿仅用于本地前端流程验证，需药师审核后使用。'
    ].join('\n')
  }
}

export async function generateMedicationEducation(request: MedicationEducationRequest): Promise<MedicationEducationDraft> {
  const statusResponse = await fetch('/api/dev/deepseek/status')
  if (statusResponse.ok) {
    const status = await statusResponse.json() as { configured?: boolean }
    if (!status.configured) return localFallbackDraft(request)
  }
  const response = await fetch('/api/dev/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      hospitalai_context: request,
      messages: [
        {
          role: 'system',
          content: 'You are a medication education drafting assistant for hospital pharmacists. Use only the supplied facts. Do not diagnose, invent doses, or change a prescription. Mark unknown information as pending confirmation. Write concise Chinese patient education covering purpose, how to use each medicine, missed doses, warning signs, monitoring and follow-up. End with: 需药师审核后使用。'
        },
        {
          role: 'user',
          content: `请根据以下脱敏患者事实和沟通画像，起草专属用药教育：\n${JSON.stringify(request, null, 2)}`
        }
      ]
    })
  })
  if (response.status === 401 || response.status === 403 || response.status === 503) return localFallbackDraft(request)
  if (!response.ok) throw new Error('DeepSeek 本地代理请求失败（HTTP ' + response.status + '）')
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('DeepSeek 未返回可编辑的教育内容')
  return { content, provider: 'deepseek' }
}
