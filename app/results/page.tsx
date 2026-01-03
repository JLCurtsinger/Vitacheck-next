"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { mockSuggestions } from "@/lib/mockSuggestions"
import { mockResults, type Severity, type InteractionSeverity } from "@/lib/mockResults"
import { buildTopRisks } from "@/lib/riskSummary"
import { TopRisksFound } from "@/components/results/TopRisksFound"
import { SourceDetailsModal } from "@/components/results/SourceDetailsModal"
import type { InteractionSource } from "@/src/lib/apiTypes"

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemIds = searchParams.get("items")?.split(",") || []
  const [activeTab, setActiveTab] = useState("all")
  const [selectedSource, setSelectedSource] = useState<{
    name: string
    data?: InteractionSource | null
    pairLabel?: string
  } | null>(null)

  // Get item labels from IDs
  const checkedItems = itemIds
    .map((id) => mockSuggestions.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  // Build top risks from pair interactions
  const topRisks = buildTopRisks(mockResults.pairs)

  // Handle risk item click: switch to pairs tab and scroll to target
  const handleRiskSelect = (targetId: string) => {
    setActiveTab("pairs")
    // Use setTimeout to ensure tab switch completes before scrolling
    setTimeout(() => {
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
        // Add a subtle highlight effect
        element.classList.add("ring-2", "ring-blue-500", "ring-offset-2", "transition-all")
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2", "transition-all")
        }, 2000)
      }
    }, 100)
  }

  const getSeverityBadgeVariant = (severity: Severity | InteractionSeverity) => {
    if (severity === "red" || severity === "severe") {
      return "destructive"
    }
    if (severity === "yellow" || severity === "moderate") {
      return "secondary"
    }
    return "default"
  }

  const getSeverityBadgeClassName = (severity: Severity | InteractionSeverity) => {
    if (severity === "yellow" || severity === "moderate") {
      return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
    }
    if (severity === "green" || severity === "minor") {
      return "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
    }
    return "" // Use default destructive variant for red/severe
  }

  const getSeverityColor = (severity: Severity | InteractionSeverity) => {
    if (severity === "red" || severity === "severe") {
      return "border-l-red-500"
    }
    if (severity === "yellow" || severity === "moderate") {
      return "border-l-yellow-500"
    }
    return "border-l-green-500"
  }

  const getSeverityLabel = (severity: InteractionSeverity) => {
    const labels = {
      severe: "Severe interaction",
      moderate: "Moderate interaction",
      minor: "Minor interaction"
    }
    return labels[severity]
  }

  const getOverallRiskLabel = (risk: Severity) => {
    const labels = {
      red: "High risk",
      yellow: "Moderate risk",
      green: "Low risk"
    }
    return labels[risk]
  }

  const getSeverityBannerConfig = (risk: Severity) => {
    if (risk === "red") {
      return {
        label: "Severe interaction detected",
        message: "Higher-risk interactions were found. Review details below.",
        borderColor: "border-l-red-500",
        textColor: "text-red-700",
        icon: AlertTriangle,
        badgeText: "Severe",
        badgeVariant: "destructive" as const,
        badgeClassName: "",
        srOnlyText: "Overall severity: Severe"
      }
    }
    if (risk === "yellow") {
      return {
        label: "Moderate interaction detected",
        message: "Some interactions were found. Review details below.",
        borderColor: "border-l-yellow-500",
        textColor: "text-yellow-700",
        icon: AlertTriangle,
        badgeText: "Moderate",
        badgeVariant: "secondary" as const,
        badgeClassName: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100",
        srOnlyText: "Overall severity: Moderate"
      }
    }
    return {
      label: "No known interaction detected",
      message: "No interactions were found in the available sources. Review details below.",
      borderColor: "border-l-green-500",
      textColor: "text-green-700",
      icon: ShieldCheck,
      badgeText: "None",
      badgeVariant: "default" as const,
      badgeClassName: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
      srOnlyText: "Overall severity: None"
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 max-w-4xl">
        <div className="space-y-8">
          {/* Top Summary Block */}
          <div className="space-y-6">
            <div>
              {/* Severity Banner */}
              <div>
                {(() => {
                  const config = getSeverityBannerConfig(mockResults.overallRisk)
                  const Icon = config.icon
                  return (
                    <Card 
                      className={`${config.borderColor} border-l-8 border-t border-r border-b bg-white`}
                      role="status"
                    >
                      <CardContent className="pt-6 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Icon 
                                className={`h-5 w-5 ${config.textColor}`}
                                aria-hidden="true"
                              />
                              <h3 className={`font-bold text-base ${config.textColor} flex-1`}>
                                {config.label}
                              </h3>
                              <Badge
                                variant={config.badgeVariant}
                                className={`text-xs py-0.5 px-2 ${config.badgeClassName}`}
                              >
                                {config.badgeText}
                              </Badge>
                            </div>
                            <span className="sr-only">{config.srOnlyText}</span>
                            <p className="text-sm text-muted-foreground">
                              {config.message}
                            </p>
                            {/* Items checked */}
                            {checkedItems.length > 0 && (
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Items checked:
                                </span>
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
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Top Risks Found */}
          {topRisks.length > 0 && (
            <div className="mt-6">
              <TopRisksFound risks={topRisks} onSelect={handleRiskSelect} />
            </div>
          )}

          {/* Interaction Severity Breakdown */}
          <div className="mt-6">
            <div className="rounded-lg border bg-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Interaction severity breakdown</h2>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Source
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Severe
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Moderate
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Minor
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        % Severe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockResults.severityBreakdown.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                      >
                        <td className="py-3 px-4 text-sm font-medium">{row.source}</td>
                        <td className="py-3 px-4 text-sm text-right">{row.total}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-600">{row.severe}</td>
                        <td className="py-3 px-4 text-sm text-right text-yellow-600">{row.moderate}</td>
                        <td className="py-3 px-4 text-sm text-right text-green-600">{row.minor}</td>
                        <td className="py-3 px-4 text-sm text-right">{row.percentSevere.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Accordion */}
              <div className="md:hidden">
                <Accordion type="single" collapsible className="w-full">
                  {mockResults.severityBreakdown.map((row, idx) => (
                    <AccordionItem 
                      key={idx} 
                      value={`breakdown-${idx}`} 
                      className={`border-b ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                    >
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex flex-1 items-center justify-between pr-2">
                          <span className="text-sm font-medium">{row.source}</span>
                          <span className="text-sm text-muted-foreground">
                            {row.percentSevere.toFixed(1)}% Severe
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2 pb-2">
                          {[
                            { label: "Total", value: row.total, color: "", isMuted: false },
                            { label: "Severe", value: row.severe, color: "text-red-600", isMuted: false },
                            { label: "Moderate", value: row.moderate, color: "text-yellow-600", isMuted: false },
                            { label: "Minor", value: row.minor, color: "text-green-600", isMuted: false },
                            { label: "% Severe", value: `${row.percentSevere.toFixed(1)}%`, color: "", isMuted: true, hasBorder: true },
                          ].map((item, detailIdx) => (
                            <div 
                              key={item.label}
                              className={`flex justify-between items-center ${detailIdx % 2 === 1 ? 'bg-muted/30' : ''} ${item.hasBorder ? 'pt-2 border-t' : ''} py-1 px-2 -mx-2 rounded`}
                            >
                              <span className={`text-sm ${item.isMuted ? 'font-medium' : 'text-muted-foreground'}`}>
                                {item.label}
                              </span>
                              <span className={`text-sm font-medium ${item.color}`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All results</TabsTrigger>
              <TabsTrigger value="pairs">Pairs</TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
            </TabsList>

            {/* All Results Tab */}
            <TabsContent value="all" className="space-y-6 mt-6">
              {/* Pair Results */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pair Interactions</h2>
                {mockResults.pairs.map((pair) => (
                  <Card
                    key={pair.id}
                    id={pair.id}
                    className={`${getSeverityColor(pair.severity)} border-l-4`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={getSeverityBadgeVariant(pair.severity)}
                          className={getSeverityBadgeClassName(pair.severity)}
                        >
                          {getSeverityLabel(pair.severity)}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {pair.itemA} + {pair.itemB}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {pair.whatThisMeans}
                      </p>
                      
                      {/* Data Sources */}
                      {pair.evidenceSources && pair.evidenceSources.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Data Sources:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {pair.evidenceSources.map((source, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  // For mock data, we don't have full InteractionSource objects
                                  // So we pass null as sourceData - modal will show "Details not available yet"
                                  setSelectedSource({
                                    name: source,
                                    data: null,
                                    pairLabel: `${pair.itemA} + ${pair.itemB}`,
                                  })
                                }}
                              >
                                {source}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={`details-${pair.id}`}>
                          <AccordionTrigger className="text-sm">
                            Details
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {/* Evidence sources */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Evidence sources
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {pair.evidenceSources.map((source, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Confidence */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Confidence
                              </p>
                              <p className="text-sm">{pair.confidence}%</p>
                            </div>

                            {/* Key notes */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Key notes
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {pair.keyNotes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Individual Results */}
              <div className="space-y-4 pt-6 border-t">
                <h2 className="text-xl font-semibold">Individual Summaries</h2>
                {mockResults.individuals.map((individual) => (
                  <Card key={individual.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{individual.itemName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {individual.safetySummary}
                      </p>
                      
                      {/* Data Sources */}
                      {individual.evidenceSources && individual.evidenceSources.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Data Sources:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {individual.evidenceSources.map((source, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  setSelectedSource({
                                    name: source,
                                    data: null,
                                    pairLabel: individual.itemName,
                                  })
                                }}
                              >
                                {source}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Pairs Tab */}
            <TabsContent value="pairs" className="space-y-4 mt-6">
              {mockResults.pairs.map((pair) => (
                <Card
                  key={pair.id}
                  id={pair.id}
                  className={`${getSeverityColor(pair.severity)} border-l-4`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getSeverityBadgeVariant(pair.severity)}>
                        {getSeverityLabel(pair.severity)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {pair.itemA} + {pair.itemB}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {pair.whatThisMeans}
                    </p>
                    
                    {/* Data Sources */}
                    {pair.evidenceSources && pair.evidenceSources.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Data Sources:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pair.evidenceSources.map((source, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                setSelectedSource({
                                  name: source,
                                  data: null,
                                  pairLabel: `${pair.itemA} + ${pair.itemB}`,
                                })
                              }}
                            >
                              {source}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={`details-${pair.id}`}>
                        <AccordionTrigger className="text-sm">
                          Details
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Evidence sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {pair.evidenceSources.map((source, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {source}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Confidence
                            </p>
                            <p className="text-sm">{pair.confidence}%</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Key notes
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {pair.keyNotes.map((note, idx) => (
                                <li key={idx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Individual Tab */}
            <TabsContent value="individual" className="space-y-4 mt-6">
              {mockResults.individuals.map((individual) => (
                <Card key={individual.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{individual.itemName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Safety summary
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {individual.safetySummary}
                      </p>
                    </div>
                    {/* Data Sources */}
                    {individual.evidenceSources && individual.evidenceSources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Data Sources:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {individual.evidenceSources.map((source, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                setSelectedSource({
                                  name: source,
                                  data: null,
                                  pairLabel: individual.itemName,
                                })
                              }}
                            >
                              {source}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Source Details Modal */}
      {selectedSource && (
        <SourceDetailsModal
          open={!!selectedSource}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSource(null)
            }
          }}
          sourceName={selectedSource.name}
          sourceData={selectedSource.data}
          pairLabel={selectedSource.pairLabel}
        />
      )}
    </main>
  )
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  )
}
