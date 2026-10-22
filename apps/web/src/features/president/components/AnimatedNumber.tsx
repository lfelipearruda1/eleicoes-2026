import { useEffect, useState } from 'react'

const DURATION_MS = 500
const LEADING_NUMBER = /^(\d{1,3}(?:\.\d{3})*)(?:,(\d+))?(.*)$/s

interface ParsedNumber {
  value: number
  decimals: number
  suffix: string
}

function parseLeadingNumber(text: string): ParsedNumber | undefined {
  const match = LEADING_NUMBER.exec(text)
  if (!match) return undefined
  const [, integer = '', fraction = '', suffix = ''] = match
  return {
    value: Number(`${integer.replaceAll('.', '')}.${fraction || '0'}`),
    decimals: fraction.length,
    suffix,
  }
}

const formatNumber = (value: number, decimals: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function AnimatedNumber({ value }: { value: string }) {
  const [target, setTarget] = useState(value)
  const [origin, setOrigin] = useState(value)
  const [text, setText] = useState(value)
  if (value !== target) {
    setTarget(value)
    setOrigin(text)
  }

  useEffect(() => {
    const from = parseLeadingNumber(origin)
    const to = parseLeadingNumber(target)
    const canAnimate =
      from && to && from.suffix === to.suffix && !prefersReducedMotion()
    const startedAt = performance.now()
    let frame = 0
    const step = () => {
      const elapsed = performance.now() - startedAt
      const progress = Math.min(elapsed / DURATION_MS, 1)
      if (!canAnimate || progress === 1) return setText(target)
      const eased = 1 - (1 - progress) ** 3
      const current = from.value + (to.value - from.value) * eased
      setText(`${formatNumber(current, to.decimals)}${to.suffix}`)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [origin, target])

  return text
}
