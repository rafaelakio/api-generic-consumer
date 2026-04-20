import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(<Input />)
    expect(screen.queryByRole('label')).not.toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('does not render error when not provided', () => {
    render(<Input />)
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument()
  })

  it('applies error styling when error is set', () => {
    render(<Input error="Error" />)
    expect(screen.getByRole('textbox').className).toContain('border-red-400')
  })

  it('accepts user input', async () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })

  it('calls onChange handler', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'x')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('passes through placeholder', () => {
    render(<Input placeholder="Enter value" />)
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })

  it('passes through type attribute', () => {
    render(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })

  it('associates label with input via htmlFor', () => {
    render(<Input label="Name" id="name-input" />)
    const label = screen.getByText('Name')
    expect(label).toHaveAttribute('for', 'name-input')
  })
})
