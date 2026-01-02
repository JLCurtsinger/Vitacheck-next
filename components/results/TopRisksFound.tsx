"use client"

import { Card, CardContent } from "@/components/ui/card"
import { type TopRiskItem, type InteractionSeverity } from "@/lib/riskSummary"

interface TopRisksFoundProps {
  risks: TopRiskItem[]
  onSelect: (targetId: string) => void
}

const getSeverityTextClassName = (severity: InteractionSeverity) => {
  if (severity === "severe") {
    return "text-red-600"
  }
  if (severity === "moderate") {
    return "text-yellow-600"
  }
  return "text-green-600" // minor
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
              <div>
                <p className="text-sm font-medium mb-1">{risk.headline}</p>
                <p className="text-xs text-muted-foreground">{risk.pairLabel}</p>
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Severity: </span>
                  <span className={`font-medium ${getSeverityTextClassName(risk.severity)}`}>
                    {getSeverityLabel(risk.severity)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

