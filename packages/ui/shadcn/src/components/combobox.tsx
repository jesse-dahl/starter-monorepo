"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/popover"

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  children: React.ReactNode
  disabled?: boolean
  buttonClassName?: string
  contentClassName?: string
}

function Combobox({
  value,
  onChange,
  placeholder = "Select an option...",
  className,
  children,
  disabled,
  buttonClassName,
  contentClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Find the selected label from children
  let selectedLabel: React.ReactNode = placeholder

  // Helper to recursively inject props into ComboboxItem children
  function injectPropsToChildren(children: React.ReactNode): React.ReactNode {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child
      const element = child as React.ReactElement<any>
      // If this is a ComboboxItem, inject selected and onSelect
      if (
        typeof element.type === "function" &&
        (element.type as any).displayName === "ComboboxItem"
      ) {
        if (element.props.value === value) {
          selectedLabel = element.props.children
        }
        return React.cloneElement(element, {
          selected: element.props.value === value,
          onSelect: (v: string) => {
            onChange(v)
            setOpen(false)
            element.props.onSelect?.(v)
          },
        })
      }
      // If this is a group/list, recurse
      if (element.props && element.props.children) {
        return React.cloneElement(element, {
          children: injectPropsToChildren(element.props.children),
        })
      }
      return child
    })
  }

  const enhancedChildren = injectPropsToChildren(children)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", buttonClassName)}
          disabled={disabled}
        >
          {selectedLabel}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[200px] p-0", contentClassName)}>
        <Command className={className}>{enhancedChildren}</Command>
      </PopoverContent>
    </Popover>
  )
}
Combobox.displayName = "Combobox"

interface ComboboxInputProps extends React.ComponentProps<typeof CommandInput> {}
const ComboboxInput = CommandInput

interface ComboboxListProps extends React.ComponentProps<typeof CommandList> {}
const ComboboxList = CommandList

interface ComboboxGroupProps extends React.ComponentProps<typeof CommandGroup> {}
const ComboboxGroup = CommandGroup

interface ComboboxEmptyProps extends React.ComponentProps<typeof CommandEmpty> {}
const ComboboxEmpty = CommandEmpty

interface ComboboxItemProps extends React.ComponentProps<typeof CommandItem> {
  value: string
  children: React.ReactNode
  selectedIcon?: React.ReactNode
  selected?: boolean
  onSelect?: (value: string) => void
}
function ComboboxItem({
  value,
  children,
  selectedIcon,
  selected,
  onSelect,
  ...props
}: ComboboxItemProps) {
  return (
    <CommandItem
      value={value}
      onSelect={() => onSelect?.(value)}
      {...props}
    >
      {selectedIcon !== undefined ? (
        selectedIcon
      ) : (
        <CheckIcon
          className={cn(
            "mr-2 h-4 w-4",
            selected ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {children}
    </CommandItem>
  )
}
ComboboxItem.displayName = "ComboboxItem"

export {
  Combobox,
  ComboboxInput,
  ComboboxList,
  ComboboxGroup,
  ComboboxEmpty,
  ComboboxItem,
}