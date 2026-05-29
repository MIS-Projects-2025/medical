import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/Components/ui/button"
import { Calendar } from "@/Components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/Components/ui/popover"

/**
 * Single date picker.
 *
 * Props:
 *   value        – Date | undefined
 *   onChange     – (date: Date | undefined) => void
 *   placeholder  – string  (default: "Pick a date")
 *   disabled     – boolean | Matcher | Matcher[]  (forwarded to Calendar)
 *   className    – string
 */
export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    displayFormat = "PPP",
    disabled,
    className,
}) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-9 overflow-hidden",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50 shrink-0" />
                    <span className="truncate">{value ? format(value, displayFormat) : placeholder}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(d) => {
                        onChange?.(d)
                        setOpen(false)
                    }}
                    disabled={disabled}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

/**
 * Multi-date picker — lets the user pick (and remove) multiple dates.
 *
 * Props:
 *   value        – Date[]
 *   onChange     – (dates: Date[]) => void
 *   placeholder  – string
 *   disabled     – Matcher | Matcher[]  (forwarded to Calendar)
 *   className    – string
 */
export function MultiDatePicker({
    value = [],
    onChange,
    placeholder = "Pick dates",
    disabled,
    className,
}) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        value.length === 0 && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {value.length > 0
                        ? `${value.length} date${value.length > 1 ? "s" : ""} selected`
                        : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="multiple"
                    selected={value}
                    onSelect={(dates) => onChange?.(dates ?? [])}
                    disabled={disabled}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
