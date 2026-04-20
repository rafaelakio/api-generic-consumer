import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button').className).toContain('bg-brand-600')
  })

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button').className).toContain('bg-gray-100')
  })

  it('applies danger variant', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-600')
  })

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button').className).toContain('text-gray-600')
  })

  it('applies sm size', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button').className).toContain('px-3')
  })

  it('applies lg size', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('px-6')
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('forwards ref', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('sets button type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
