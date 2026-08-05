import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPharmacistReviews,
  resolvePharmacistReview,
  fetchCollaborationTasks,
  resolveCollaborationTask,
  fetchKnowledgeSubmissions,
  reviewKnowledgeSubmission
} from '../src/services/coreApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('coreApi pharmacist & collaboration wrappers', () => {
  it('fetchPharmacistReviews GETs /api/pharmacist/reviews', async () => {
    const payload = [
      {
        reviewId: 'PR-1',
        recommendationId: 'REC-E001-v1',
        decisionId: null,
        encounterId: 'E001',
        patientId: 'P001',
        patientName: '合成患者A',
        sex: 'F',
        age: 66,
        department: '呼吸内科',
        diagnosis: '社区获得性肺炎',
        drugNames: ['阿奇霉素'],
        status: 'pending',
        priority: 'high',
        reason: '跨科室重复用药需复核',
        assignedRole: 'pharmacist',
        createdAt: '2026-08-05T09:00:00Z',
        resolvedAt: null,
        resolution: null
      }
    ]
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPharmacistReviews('pending')
    expect(fetchMock).toHaveBeenCalledWith('/api/pharmacist/reviews?status=pending')
    expect(result[0].reviewId).toBe('PR-1')
    expect(result[0].patientName).toBe('合成患者A')
  })

  it('resolvePharmacistReview POSTs with pharmacist role header', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ reviewId: 'PR-1', status: 'resolved' }) }))
    vi.stubGlobal('fetch', fetchMock)

    await resolvePharmacistReview('PR-1', 'continue')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/pharmacist/reviews/PR-1/resolve')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-HospitalAI-Role']).toBe('pharmacist')
    expect(JSON.parse(String(init.body))).toEqual({ resolution: 'continue' })
  })

  it('fetchCollaborationTasks GETs /api/collaboration/tasks', async () => {
    const payload = [
      {
        taskId: 'COL-1',
        recommendationId: 'REC-E001-v1',
        encounterId: 'E001',
        sourceDepartment: '呼吸内科',
        targetDepartment: '心内科',
        status: 'pending',
        reason: '跨科室重复用药',
        createdAt: '2026-08-05T09:00:00Z',
        resolvedAt: null,
        resolution: null
      }
    ]
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCollaborationTasks('pending')
    expect(fetchMock).toHaveBeenCalledWith('/api/collaboration/tasks?status=pending')
    expect(result[0].taskId).toBe('COL-1')
  })

  it('resolveCollaborationTask POSTs with pharmacist role header', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ taskId: 'COL-1', status: 'resolved' }) }))
    vi.stubGlobal('fetch', fetchMock)

    await resolveCollaborationTask('COL-1', 'adjust_existing')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/collaboration/tasks/COL-1/resolve')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-HospitalAI-Role']).toBe('pharmacist')
    expect(JSON.parse(String(init.body))).toEqual({ resolution: 'adjust_existing' })
  })
})

describe('coreApi knowledge wrappers', () => {
  it('fetchKnowledgeSubmissions GETs /api/knowledge/submissions', async () => {
    const payload = [
      {
        submissionId: 'KS-1',
        reportId: 'RPT-CAP-006-v2',
        status: 'review_pending',
        submissionType: 'research',
        title: 'CAP 住院患者初始方案院内观察结论',
        submittedBy: '研究负责人·周医生',
        submittedAt: '2026-08-05T09:00:00Z',
        publishedAt: null
      }
    ]
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchKnowledgeSubmissions()
    expect(fetchMock).toHaveBeenCalledWith('/api/knowledge/submissions?status=review_pending')
    expect(result[0].submissionId).toBe('KS-1')
  })

  it('reviewKnowledgeSubmission POSTs approve with given role header', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ reviewId: 'RV-1', submissionId: 'KS-1', reviewerRole: 'pharmacist', decision: 'approve', note: '通过', reviewedAt: '2026-08-05T10:00:00Z' }) }))
    vi.stubGlobal('fetch', fetchMock)

    await reviewKnowledgeSubmission('KS-1', 'pharmacist', 'approve', '通过')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/knowledge/submissions/KS-1/reviews')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-HospitalAI-Role']).toBe('pharmacist')
    expect(JSON.parse(String(init.body))).toEqual({ reviewerRole: 'pharmacist', decision: 'approve', note: '通过' })
  })
})
