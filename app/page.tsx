"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MultiItemCombobox } from "@/components/MultiItemCombobox"
import { mockSuggestions, type SuggestionItem } from "@/lib/mockSuggestions"

export default function HomePage() {
  const [selectedItems, setSelectedItems] = React.useState<SuggestionItem[]>([])
  const router = useRouter()

  const handleCheckInteractions = () => {
    if (selectedItems.length < 2) {
      return
    }

    // Navigate to checking page with query params
    const itemIds = selectedItems.map((item) => item.id).join(",")
    router.push(`/checking?items=${itemIds}`)
  }

  const getHelperText = () => {
    if (selectedItems.length === 0) {
      return "Add 2 or more items to check."
    }
    if (selectedItems.length === 1) {
      return "Add 1 more item to check."
    }
    return null
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            See if medications and supplements mix safely.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Enter medications or supplements,
            then check for interactions.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <MultiItemCombobox
            items={selectedItems}
            onItemsChange={setSelectedItems}
            suggestions={mockSuggestions}
            label=""
            placeholder="Type a medication or supplement here..."
          />

          {/* CTA Section */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            <Button
              onClick={handleCheckInteractions}
              disabled={selectedItems.length < 2}
              className="w-full sm:w-[280px] disabled:opacity-100 disabled:bg-primary disabled:text-white"
              size="lg"
            >
              Check interactions
            </Button>
            {getHelperText() && (
              <p className="text-sm text-muted-foreground">
                {getHelperText()}
              </p>
            )}
            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground">
              Informational only, not medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

