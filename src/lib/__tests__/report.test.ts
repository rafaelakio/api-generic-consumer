import { describe, it, expect } from 'vitest'
import { buildReport } from '../report'
import type { ChangeSession, CallLog } from '@/types'

const baseSession: ChangeSession = {
  changeNumber: 'CHG0001234',
  startTime: new Date('2024-01-15T08:00:00'),
  endTime: new Date('2024-01-15T10:00:00'),
  openedAt: new Date('2024-01-15T08:05:00'),
  openedBy: 'usuario.teste',
}

const closedAt = new Date('2024-01-15T09:30:00')

describe('buildReport – structure', () => {
  it('contains the change number', () => {
    const report = buildReport(baseSession, [], closedAt)
    expect(report).toContain('CHG0001234')
  })

  it('contains the section headers', () => {
    const report = buildReport(baseSession, [], closedAt)
    expect(report).toContain('RELATÓRIO DE MUDANÇA')
    expect(report).toContain('DADOS DA SESSÃO')
    expect(report).toContain('URLS CONSUMIDAS')
  })

  it('contains the operator name', () => {
    const report = buildReport(baseSession, [], closedAt)
    expect(report).toContain('usuario.teste')
  })

  it('shows empty call message when no logs', () => {
    const report = buildReport(baseSession, [], closedAt)
    expect(report).toContain('Nenhuma chamada realizada nesta sessão.')
  })
})

describe('buildReport – call logs', () => {
  const log: CallLog = {
    seq: 1,
    timestamp: new Date('2024-01-15T08:10:00'),
    method: 'GET',
    url: 'https://api.example.com/users',
    statusCode: 200,
    statusText: 'OK',
    responseTimeMs: 150,
  }

  it('renders call log rows', () => {
    const report = buildReport(baseSession, [log], closedAt)
    expect(report).toContain('GET')
    expect(report).toContain('200')
    expect(report).toContain('150')
  })

  it('renders column headers when logs exist', () => {
    const report = buildReport(baseSession, [log], closedAt)
    expect(report).toContain('Timestamp')
    expect(report).toContain('Método')
    expect(report).toContain('URL')
    expect(report).toContain('Status')
  })

  it('truncates long URLs', () => {
    const longUrlLog: CallLog = {
      ...log,
      url: 'https://api.example.com/' + 'a'.repeat(100),
    }
    const report = buildReport(baseSession, [longUrlLog], closedAt)
    expect(report).toContain('…')
  })

  it('renders error in status column', () => {
    const errorLog: CallLog = {
      ...log,
      statusCode: 0,
      statusText: '',
      error: 'Connection refused',
    }
    const report = buildReport(baseSession, [errorLog], closedAt)
    expect(report).toContain('ERRO:')
  })

  it('renders multiple call logs', () => {
    const logs: CallLog[] = [
      { ...log, seq: 1 },
      { ...log, seq: 2, method: 'POST', statusCode: 201, statusText: 'Created' },
    ]
    const report = buildReport(baseSession, logs, closedAt)
    expect(report).toContain('POST')
    expect(report).toContain('201')
  })
})

describe('buildReport – duration formatting', () => {
  it('formats sub-second duration as 0s', () => {
    const session = { ...baseSession, startTime: new Date('2024-01-15T08:00:00'), endTime: new Date('2024-01-15T08:00:00') }
    const report = buildReport(session, [], closedAt)
    expect(report).toContain('0s')
  })

  it('formats seconds-only duration', () => {
    const session = { ...baseSession, startTime: new Date('2024-01-15T08:00:00'), endTime: new Date('2024-01-15T08:00:45') }
    const report = buildReport(session, [], closedAt)
    expect(report).toContain('45s')
  })

  it('formats minutes duration', () => {
    const session = { ...baseSession, startTime: new Date('2024-01-15T08:00:00'), endTime: new Date('2024-01-15T08:05:00') }
    const report = buildReport(session, [], closedAt)
    expect(report).toContain('5min')
  })

  it('formats hours duration', () => {
    const session = { ...baseSession, startTime: new Date('2024-01-15T08:00:00'), endTime: new Date('2024-01-15T10:00:00') }
    const report = buildReport(session, [], closedAt)
    expect(report).toContain('2h')
  })

  it('formats hours + minutes + seconds', () => {
    const session = {
      ...baseSession,
      startTime: new Date('2024-01-15T08:00:00'),
      endTime: new Date('2024-01-15T09:30:45'),
    }
    const report = buildReport(session, [], closedAt)
    expect(report).toContain('1h')
    expect(report).toContain('30min')
    expect(report).toContain('45s')
  })
})
