import { useRef } from 'react'

interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  label: string
  value: T
  items: TabItem<T>[]
  onChange: (value: T) => void
}

export function Tabs<T extends string>({ label, value, items, onChange }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.value === value)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return

    event.preventDefault()
    onChange(items[next].value)
    const buttons = listRef.current?.querySelectorAll('button')
    buttons?.[next]?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={handleKeyDown}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          className="tab"
          aria-selected={item.value === value}
          tabIndex={item.value === value ? 0 : -1}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
