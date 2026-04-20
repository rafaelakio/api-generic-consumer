import { describe, it, expect } from 'vitest'
import { maskPiiBody, countPiiMatches } from '../pii-mask'

// ─── maskPiiBody ──────────────────────────────────────────────────────────────

describe('maskPiiBody – name masking', () => {
  it('masks full name to first + last initial', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ nome: 'João da Silva' })))
    expect(result.nome).toBe('João S.')
  })

  it('masks single-word name to initial', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ nome: 'João' })))
    expect(result.nome).toBe('J.')
  })

  it('masks composite key via substring fallback (nomeCompleto)', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ nomeCompleto: 'Ana Lima' })))
    expect(result.nomeCompleto).toBe('Ana L.')
  })
})

describe('maskPiiBody – CPF masking', () => {
  it('masks formatted CPF keeping last 2 digits', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ cpf: '123.456.789-10' })))
    expect(result.cpf).toBe('***.***.***-10')
  })

  it('masks unformatted CPF', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ cpf: '12345678910' })))
    expect(result.cpf).toBe('*********10')
  })
})

describe('maskPiiBody – CNPJ masking', () => {
  it('masks formatted CNPJ keeping last 2 digits', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ cnpj: '12.345.678/0001-90' })))
    expect(result.cnpj).toBe('**.***.***/****-90')
  })
})

describe('maskPiiBody – email masking', () => {
  it('masks email keeping first char and domain', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ email: 'joao.silva@example.com' })))
    expect(result.email).toBe('j***@example.com')
  })

  it('masks email-like string without @ sign', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ email: 'notanemail' })))
    expect(result.email).toBe('n***')
  })

  it('masks via mail key alias', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ mail: 'a@b.com' })))
    expect(result.mail).toBe('a***@b.com')
  })
})

describe('maskPiiBody – phone masking', () => {
  it('masks phone with >= 10 digits keeping first 5 and last 4', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ telefone: '+55 11 91234-5678' })))
    expect(result.telefone).toMatch(/^\+55 11 9/)
    expect(result.telefone).toMatch(/5678$/)
  })

  it('masks short phone keeping first 2 and last 4', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ phone: '12345678' })))
    // 8 digits: keepStart=2, keepEnd=4 → mask positions 2-3 → "12**5678"
    expect(result.phone).toBe('12**5678')
  })
})

describe('maskPiiBody – address masking', () => {
  it('masks street name', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ rua: 'Rua das Flores' })))
    expect(result.rua).toBe('Rua das F.')
  })

  it('masks single-word street', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ logradouro: 'Avenida' })))
    expect(result.logradouro).toBe('A.')
  })

  it('masks numero field to ***', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ numero: 42 })))
    expect(result.numero).toBe('***')
  })

  it('masks CEP keeping first 3 and last 3 digits', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ cep: '04567-000' })))
    expect(result.cep).toBe('045**-000')
  })

  it('masks zipcode alias', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ zipcode: '12345-678' })))
    expect(result.zipcode).toBe('123**-678')
  })
})

describe('maskPiiBody – card masking', () => {
  it('masks card keeping first 4 and last 4 digits', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ card: '1234 5678 9012 3456' })))
    expect(result.card).toBe('1234 **** **** 3456')
  })
})

describe('maskPiiBody – generic masking', () => {
  it('masks generic field keeping first and last 2 chars', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ password: 'secretpass' })))
    expect(result.password).toBe('s*******ss')
  })

  it('masks short generic field (<= 4 chars) with all asterisks', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ token: 'abc' })))
    expect(result.token).toBe('***')
  })

  it('masks rg (document type generic)', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ rg: '12.345.678-9' })))
    expect(result.rg).toBeDefined()
  })
})

describe('maskPiiBody – deep traversal', () => {
  it('masks nested object fields', () => {
    const input = JSON.stringify({ user: { nome: 'Maria Silva', cpf: '111.222.333-44' } })
    const result = JSON.parse(maskPiiBody(input))
    expect(result.user.nome).toBe('Maria S.')
    expect(result.user.cpf).toBe('***.***.***-44')
  })

  it('masks arrays of objects', () => {
    const input = JSON.stringify({ users: [{ nome: 'Ana Lima' }, { nome: 'Pedro Souza' }] })
    const result = JSON.parse(maskPiiBody(input))
    expect(result.users[0].nome).toBe('Ana L.')
    expect(result.users[1].nome).toBe('Pedro S.')
  })

  it('passes through non-PII fields untouched', () => {
    const input = JSON.stringify({ id: 1, status: 'active' })
    const result = JSON.parse(maskPiiBody(input))
    expect(result.id).toBe(1)
    expect(result.status).toBe('active')
  })

  it('passes through null values', () => {
    const input = JSON.stringify({ nome: null })
    const result = JSON.parse(maskPiiBody(input))
    expect(result.nome).toBeNull()
  })

  it('passes through boolean values', () => {
    const input = JSON.stringify({ active: true })
    const result = JSON.parse(maskPiiBody(input))
    expect(result.active).toBe(true)
  })
})

describe('maskPiiBody – inline pattern masking (plain text)', () => {
  it('masks email in plain text', () => {
    expect(maskPiiBody('Contact: joao@example.com today')).toContain('j***@example.com')
  })

  it('masks CPF in plain text', () => {
    expect(maskPiiBody('CPF: 123.456.789-10')).toContain('***.***.***-10')
  })

  it('masks credit card via JSON key', () => {
    const result = JSON.parse(maskPiiBody(JSON.stringify({ card: '1234 5678 9012 3456' })))
    expect(result.card).toBe('1234 **** **** 3456')
  })

  it('returns plain text unchanged if no PII found', () => {
    expect(maskPiiBody('Hello world')).toBe('Hello world')
  })
})

// ─── countPiiMatches ──────────────────────────────────────────────────────────

describe('countPiiMatches – JSON input', () => {
  it('counts PII fields in JSON', () => {
    const input = JSON.stringify({ nome: 'João', cpf: '123.456.789-10', id: 1 })
    expect(countPiiMatches(input)).toBe(2)
  })

  it('returns 0 for JSON with no PII fields', () => {
    expect(countPiiMatches(JSON.stringify({ id: 1, status: 'ok' }))).toBe(0)
  })

  it('counts nested PII fields', () => {
    const input = JSON.stringify({ user: { nome: 'Ana', email: 'a@b.com' } })
    expect(countPiiMatches(input)).toBe(2)
  })
})

describe('countPiiMatches – plain text fallback', () => {
  it('counts inline email patterns', () => {
    expect(countPiiMatches('user@example.com and admin@test.org')).toBe(2)
  })

  it('counts inline CPF patterns', () => {
    expect(countPiiMatches('123.456.789-10 and 987.654.321-00')).toBe(2)
  })

  it('returns 0 for text with no PII patterns', () => {
    expect(countPiiMatches('nothing to see here')).toBe(0)
  })
})
