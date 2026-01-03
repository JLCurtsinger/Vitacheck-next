"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { InteractionSource } from "@/src/lib/apiTypes"

interface SourceDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceName: string
  sourceData?: InteractionSource | null
  pairLabel?: string
}

const getSeverityBadgeVariant = (severity?: string) => {
  if (severity === "severe") {
    return "destructive"
  }
  if (severity === "moderate") {
    return "secondary"
  }
  return "default"
}

const getSeverityBadgeClassName = (severity?: string) => {
  if (severity === "moderate") {
    return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
  }
  if (severity === "minor" || severity === "mild") {
    return "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
  }
  return ""
}

const formatDate = (dateString?: string) => {
  if (!dateString) return null
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return null
  }
}

const isOpenFdaSource = (sourceName: string) => {
  return sourceName.toLowerCase().includes("openfda") || 
         sourceName.toLowerCase().includes("faers") ||
         sourceName.toLowerCase() === "openfda"
}

export function SourceDetailsModal({
  open,
  onOpenChange,
  sourceName,
  sourceData,
  pairLabel,
}: SourceDetailsModalProps) {
  const hasDetails = sourceData !== null && sourceData !== undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sourceName}</DialogTitle>
          {pairLabel && (
            <DialogDescription>{pairLabel}</DialogDescription>
          )}
        </DialogHeader>

        {!hasDetails ? (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Details not available yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Source Assessment */}
            {(sourceData.severity || sourceData.confidence !== undefined) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Source Assessment</h3>
                <div className="flex flex-wrap gap-2">
                  {sourceData.severity && sourceData.severity !== "unknown" && (
                    <Badge
                      variant={getSeverityBadgeVariant(sourceData.severity)}
                      className={getSeverityBadgeClassName(sourceData.severity)}
                    >
                      {sourceData.severity.charAt(0).toUpperCase() + sourceData.severity.slice(1)}
                    </Badge>
                  )}
                  {sourceData.confidence !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Confidence: {(sourceData.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Retrieved timestamp */}
            {sourceData.lastUpdated && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Data Retrieved</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(sourceData.lastUpdated) || sourceData.lastUpdated}
                </p>
              </div>
            )}

            {/* Summary */}
            {sourceData.summary && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Summary</h3>
                <p className="text-sm text-muted-foreground">
                  {sourceData.summary}
                </p>
              </div>
            )}

            {/* Citations */}
            {sourceData.citations && sourceData.citations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Citations</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {sourceData.citations.map((citation, idx) => (
                    <li key={idx}>
                      {citation.startsWith("http") ? (
                        <a
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {citation}
                        </a>
                      ) : (
                        citation
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stats */}
            {sourceData.stats && Object.keys(sourceData.stats).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Statistics</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {sourceData.stats.eventCounts !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Total Events: </span>
                      <span className="font-medium">{sourceData.stats.eventCounts.toLocaleString()}</span>
                    </div>
                  )}
                  {sourceData.stats.seriousEventCounts !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Serious Events: </span>
                      <span className="font-medium">{sourceData.stats.seriousEventCounts.toLocaleString()}</span>
                    </div>
                  )}
                  {sourceData.stats.beneficiaries !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Beneficiaries: </span>
                      <span className="font-medium">{sourceData.stats.beneficiaries.toLocaleString()}</span>
                    </div>
                  )}
                  {sourceData.stats.eventRate !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Event Rate: </span>
                      <span className="font-medium">{(sourceData.stats.eventRate * 100).toFixed(4)}%</span>
                    </div>
                  )}
                  {sourceData.stats.seriousEventRate !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Serious Event Rate: </span>
                      <span className="font-medium">{(sourceData.stats.seriousEventRate * 100).toFixed(4)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evidence Details (collapsible raw data) */}
            {sourceData.details && Object.keys(sourceData.details).length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="evidence">
                  <AccordionTrigger className="text-sm">
                    Evidence Details
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(sourceData.details, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Disclaimer for openFDA/FAERS */}
            {isOpenFdaSource(sourceName) && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  <strong>Note:</strong> This data comes from voluntary reporting and does not establish causation. 
                  Reports may include incomplete, inaccurate, or unverified information.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

