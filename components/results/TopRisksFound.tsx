"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { type TopRiskItem, type InteractionSeverity } from "@/lib/riskSummary"

interface TopRisksFoundProps {
  risks: TopRiskItem[]
  onSelect: (targetId: string) => void
}

const getSeverityBadgeVariant = (severity: InteractionSeverity) => {
  if (severity === "severe") {
    return "destructive"
  }
  if (severity === "moderate") {
    return "secondary"
  }
  return "default"
}

const getSeverityBadgeClassName = (severity: InteractionSeverity) => {
  if (severity === "moderate") {
    return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
  }
  if (severity === "minor") {
    return "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
  }
  return "" // Use default destructive variant for severe
}

const getSeverityLabel = (severity: InteractionSeverity) => {
  const labels = {
    severe: "Severe",
    moderate: "Moderate",
    minor: "Minor"
  }
  return labels[severity]
}

export function TopRisksFound({ risks, onSelect }: TopRisksFoundProps) {
  if (risks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Top risks found</h2>
      <div className="space-y-2">
        {risks.map((risk) => (
          <Card
            key={risk.targetId}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelect(risk.targetId)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{risk.headline}</p>
                  <p className="text-xs text-muted-foreground">{risk.pairLabel}</p>
                </div>
                <Badge
                  variant={getSeverityBadgeVariant(risk.severity)}
                  className={`text-xs py-0.5 px-2 shrink-0 ${getSeverityBadgeClassName(risk.severity)}`}
                >
                  {getSeverityLabel(risk.severity)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

