"use client"

import { Suspense, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { mockSuggestions } from "@/lib/mockSuggestions"

function CheckingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemsParam = searchParams.get("items") ?? ""
  const itemIds = useMemo(() => (itemsParam ? itemsParam.split(",") : []), [itemsParam])

  // Get item labels from IDs
  const checkedItems = itemIds
    .map((id) => mockSuggestions.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  useEffect(() => {
    // Simulate async work with delay (800-1200ms)
    const delay = Math.random() * 400 + 800 // Random between 800-1200ms
    const itemsParam = itemIds.join(",")
    const timer = setTimeout(() => {
      // Navigate to results with same query params
      router.push(`/results?items=${itemsParam}`)
    }, delay)

    return () => clearTimeout(timer)
  }, [router, itemIds])

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Checking interactions
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Analyzing interactions across multiple databases…
            </p>
          </div>

          {/* Items checked */}
          {checkedItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Items checked
              </h2>
              <div className="flex flex-wrap gap-2">
                {checkedItems.map((item) => (
                  <Badge
                    key={item.id}
                    variant="outline"
                    className="text-sm py-1 px-3"
                  >
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Loading spinner/skeleton */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CheckingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
            <div className="text-center space-y-4">
              <Skeleton className="h-10 w-64 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
          </div>
        </main>
      }
    >
      <CheckingContent />
    </Suspense>
  )
}

