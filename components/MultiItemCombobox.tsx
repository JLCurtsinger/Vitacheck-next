"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SuggestionItem } from "@/lib/mockSuggestions"
import { filterSuggestions } from "@/lib/mockSuggestions"

interface MultiItemComboboxProps {
  items: SuggestionItem[]
  onItemsChange: (items: SuggestionItem[]) => void
  suggestions: SuggestionItem[]
  label: string
  placeholder?: string
}

/**
 * MultiItemCombobox - A chip list with always-open input for selecting multiple items.
 * 
 * Features:
 * - Chip list with removable items (X button)
 * - Always-open input that stays focused after selection
 * - Keyboard navigation: Arrow keys, Enter, Esc, Backspace
 * - Debounced filtering (250ms)
 * - Accessible with ARIA labels and focus management
 * - Big tap targets (>= 44px) for mobile
 */
export function MultiItemCombobox({
  items,
  onItemsChange,
  suggestions: allSuggestions,
  label,
  placeholder = "Type to search...",
}: MultiItemComboboxProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const debounceTimerRef = React.useRef<NodeJS.Timeout>()
  const mouseDownRef = React.useRef(false)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Remote suggestions from API
  const [remoteSuggestions, setRemoteSuggestions] = React.useState<SuggestionItem[]>([])
  
  // Debounced filtering (250ms)
  // Initialize as empty - only show suggestions when user engages
  const [filteredSuggestions, setFilteredSuggestions] =
    React.useState<SuggestionItem[]>([])

  React.useEffect(() => {
    // Only filter suggestions when dropdown is open (user has engaged)
    if (!isOpen) {
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmedInput = inputValue.trim()

    // Clear remote suggestions if input is too short
    if (trimmedInput.length < 2) {
      setRemoteSuggestions([])
      // Use fallback mock suggestions filtering
      const filtered = filterSuggestions(trimmedInput, allSuggestions)
      const available = filtered.filter(
        (item) => !items.some((selected) => selected.id === item.id)
      )
      setFilteredSuggestions(available)
      setHighlightedIndex(-1)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      // Create new AbortController for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Fetch from API
      const query = encodeURIComponent(trimmedInput)
      fetch(`/api/rxterms/autocomplete?q=${query}`, {
        signal: abortController.signal,
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }
          return res.json()
        })
        .then((data: { results: { display: string; value: string }[] }) => {
          // Check if request was aborted
          if (abortController.signal.aborted) {
            return
          }

          // Map API results to SuggestionItem format
          const mapped: SuggestionItem[] = data.results.map((result) => ({
            id: result.value,
            label: result.display,
            kind: "medication" as const,
          }))

          // Filter out already selected items
          const available = mapped.filter(
            (item) => !items.some((selected) => selected.id === item.id)
          )

          setRemoteSuggestions(mapped)
          setFilteredSuggestions(available)
          setHighlightedIndex(-1)
        })
        .catch((error) => {
          // Silently fall back to mock suggestions on error
          // (network error, abort, or API error)
          if (error.name === "AbortError") {
            return // Request was cancelled, ignore
          }

          // Fallback to mock suggestions filtering
          const filtered = filterSuggestions(trimmedInput, allSuggestions)
          const available = filtered.filter(
            (item) => !items.some((selected) => selected.id === item.id)
          )
          setFilteredSuggestions(available)
          setHighlightedIndex(-1)
        })
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [inputValue, allSuggestions, items, isOpen])

  // Keep input focused after selection (but don't auto-focus on mount)
  React.useEffect(() => {
    if (items.length > 0 && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus()
    }
  }, [items])

  // Handle outside clicks to close dropdown
  React.useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        mouseDownRef.current = true
      } else {
        mouseDownRef.current = false
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (mouseDownRef.current && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
      mouseDownRef.current = false
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleMouseDown)
      document.addEventListener("click", handleClick)
      return () => {
        document.removeEventListener("mousedown", handleMouseDown)
        document.removeEventListener("click", handleClick)
      }
    }
  }, [isOpen])

  const handleSelect = (item: SuggestionItem) => {
    if (!items.some((selected) => selected.id === item.id)) {
      onItemsChange([...items, item])
      setInputValue("")
      setIsOpen(false)
      setHighlightedIndex(-1)
      // Keep input focused
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleRemove = (itemId: string) => {
    onItemsChange(items.filter((item) => item.id !== itemId))
    // Keep input focused
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) => {
        const next = prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        // Scroll into view
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement
          item?.scrollIntoView({ block: "nearest" })
        }
        return next
      })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : -1
        // Scroll into view
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement
          item?.scrollIntoView({ block: "nearest" })
        }
        return next
      })
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        handleSelect(filteredSuggestions[highlightedIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsOpen(false)
      setHighlightedIndex(-1)
    } else if (e.key === "Backspace" && inputValue === "" && items.length > 0) {
      e.preventDefault()
      handleRemove(items[items.length - 1].id)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputBlur = () => {
    // Delay closing to allow clicks on suggestions
    // The outside click handler will handle closing when clicking outside
    setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement) &&
        !mouseDownRef.current
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }, 200)
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="multi-item-input"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
      <div className="relative" ref={containerRef}>
        {/* Chip list container */}
        <div className="flex flex-wrap gap-2 min-h-[44px] p-2 border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="h-8 px-3 py-1 flex items-center gap-1.5"
            >
              <span className="text-xs">{item.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="ml-1 rounded-full hover:bg-secondary-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 p-0.5"
                aria-label={`Remove ${item.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {/* Always-open input */}
          <Input
            id="multi-item-input"
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={
              items.length === 0
                ? "Type a medication or supplement here…"
                : "Enter another medication or supplement…"
            }
            className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-2"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="suggestions-list"
            role="combobox"
          />
        </div>

        {/* Suggestions dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
            {filteredSuggestions.length > 0 ? (
              <ul
                id="suggestions-list"
                ref={listRef}
                className="max-h-64 overflow-auto"
                role="listbox"
              >
                {filteredSuggestions.map((item, index) => (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    className={cn(
                      "min-h-[44px] px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      highlightedIndex === index && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      // Prevent blur from closing dropdown when clicking suggestion
                      e.preventDefault()
                    }}
                  >
                    <span className="flex-1 text-sm">{item.label}</span>
                    <Badge
                      variant={
                        item.kind === "medication" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {item.kind === "medication" ? "Medication" : "Supplement"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : inputValue === "" && items.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground min-h-[44px] flex items-center">
                Start typing to see suggestions
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground min-h-[44px] flex items-center">
                No matches. Try a different spelling.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

