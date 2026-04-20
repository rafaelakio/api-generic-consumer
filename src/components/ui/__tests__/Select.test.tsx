import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '../Select'

const options = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option C' })).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Select options={options} label="Choose" id="sel" />)
    expect(screen.getByLabelText('Choose')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(<Select options={options} />)
    expect(screen.queryByRole('label')).not.toBeInTheDocument()
  })

  it('associates label with select via htmlFor', () => {
    render(<Select options={options} label="Pick one" id="pick" />)
    const label = screen.getByText('Pick one')
    expect(label).toHaveAttribute('for', 'pick')
  })

  it('calls onChange when selection changes', async () => {
    const onChange = vi.fn()
    render(<Select options={options} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'b')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders with correct selected value', () => {
    render(<Select options={options} value="b" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('b')
  })

  it('forwards ref', () => {
    const ref = { current: null as HTMLSelectElement | null }
    render(<Select options={options} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })

  it('applies custom className', () => {
    render(<Select options={options} className="my-class" />)
    expect(screen.getByRole('combobox').className).toContain('my-class')
  })

  it('renders empty options list', () => {
    render(<Select options={[]} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})
