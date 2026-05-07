import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Custom Select — provides the same named exports as the Radix-UI ShadCN Select.
 *
 * How label resolution works:
 *   Each SelectItem registers its value→label pair into a ref on mount.
 *   SelectContent always renders (hidden via CSS when closed) so items are
 *   always mounted and their labels are always registered — even before the
 *   dropdown has been opened for the first time.
 *   SelectValue reads from that registry to display the label, not the raw value.
 */

const SelectContext = React.createContext(null)

function Select({ value, defaultValue, onValueChange, children, disabled }) {
  const [open, setOpen]                   = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const [labelMap, setLabelMap]           = React.useState({})
  const containerRef = React.useRef(null)

  const currentValue = value !== undefined ? value : internalValue

  // Called by each SelectItem on mount — triggers a re-render so SelectValue
  // can resolve the label immediately, even before the dropdown is opened.
  const registerLabel = React.useCallback((val, label) => {
    setLabelMap((prev) => {
      if (prev[String(val)] === label) return prev // skip if unchanged
      return { ...prev, [String(val)]: label }
    })
  }, [])

  const handleSelect = React.useCallback((v) => {
    if (value === undefined) setInternalValue(v)
    onValueChange?.(v)
    setOpen(false)
  }, [value, onValueChange])

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  return (
    <SelectContext.Provider value={{ open, setOpen, currentValue, handleSelect, disabled, labelMap, registerLabel }}>
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)
  return (
    <button
      ref={ref}
      type="button"
      disabled={ctx?.disabled}
      onClick={() => ctx?.setOpen((o) => !o)}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
        "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

function SelectValue({ placeholder }) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  const label = ctx.currentValue
    ? (ctx.labelMap[String(ctx.currentValue)] ?? ctx.currentValue)
    : null

  return (
    <span className={cn(!label && "text-muted-foreground")}>
      {label || placeholder || ""}
    </span>
  )
}

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)

  // Always render so SelectItems can register their labels on mount.
  // Use `hidden` (display:none) instead of returning null — items stay mounted
  // and labels stay registered even while the dropdown is closed.
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        "top-full mt-1 left-0",
        ctx?.open
          ? "animate-in fade-in-0 zoom-in-95"
          : "hidden",
        className
      )}
      {...props}
    >
      <div className="max-h-60 overflow-y-auto p-1">
        {children}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)
  const isSelected = ctx?.currentValue === value

  // Register value→label so SelectValue can resolve the display text.
  // Runs on mount and whenever value/children change.
  React.useEffect(() => {
    if (!ctx?.registerLabel) return
    const label = typeof children === "string" ? children : String(value)
    ctx.registerLabel(value, label)
  }, [value, children]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      onClick={() => ctx?.handleSelect(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent/50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

const SelectGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-1", className)} {...props} />
))
SelectGroup.displayName = "SelectGroup"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
}
