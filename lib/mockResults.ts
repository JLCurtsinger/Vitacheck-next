// TODO: Remove mockResults when API integration is ready

export type Severity = "green" | "yellow" | "red"
export type InteractionSeverity = "severe" | "moderate" | "minor"

export type EvidenceSource = "FDA" | "openFDA" | "AI Literature Analysis" | "DrugBank" | "PubMed"

export interface PairResult {
  id: string
  itemA: string
  itemB: string
  severity: InteractionSeverity
  whatThisMeans: string
  evidenceSources: EvidenceSource[]
  confidence: number
  keyNotes: string[]
}

export interface IndividualResult {
  id: string
  itemName: string
  safetySummary: string
  evidenceSources: EvidenceSource[]
}

export interface SeverityBreakdownRow {
  source: string
  total: number
  severe: number
  moderate: number
  minor: number
  percentSevere: number
}

export interface InteractionResults {
  overallRisk: Severity
  overallRiskExplanation: string
  pairs: PairResult[]
  individuals: IndividualResult[]
  severityBreakdown: SeverityBreakdownRow[]
}

export const mockResults: InteractionResults = {
  overallRisk: "yellow",
  overallRiskExplanation: "Some moderate interactions were found. Review details below.",
  pairs: [
    {
      id: "pair-1",
      itemA: "Ibuprofen",
      itemB: "Aspirin",
      severity: "moderate",
      whatThisMeans: "Taking these together may increase the risk of gastrointestinal bleeding.",
      evidenceSources: ["FDA", "openFDA", "AI Literature Analysis"],
      confidence: 85,
      keyNotes: [
        "Both medications can cause stomach irritation",
        "Risk increases with prolonged use",
        "Consider spacing doses or using alternative pain relief"
      ]
    },
    {
      id: "pair-2",
      itemA: "Sertraline",
      itemB: "St. John's Wort",
      severity: "severe",
      whatThisMeans: "This combination may lead to serotonin syndrome, a potentially serious condition.",
      evidenceSources: ["FDA", "DrugBank", "PubMed", "AI Literature Analysis"],
      confidence: 92,
      keyNotes: [
        "Both increase serotonin levels",
        "Can cause agitation, confusion, rapid heart rate",
        "Avoid combining these substances"
      ]
    },
    {
      id: "pair-3",
      itemA: "Omeprazole",
      itemB: "Vitamin D",
      severity: "minor",
      whatThisMeans: "Omeprazole may slightly reduce vitamin D absorption.",
      evidenceSources: ["AI Literature Analysis", "PubMed"],
      confidence: 68,
      keyNotes: [
        "Effect is generally minimal",
        "Consider taking vitamin D with food",
        "Monitor vitamin D levels if on long-term omeprazole"
      ]
    }
  ],
  individuals: [
    {
      id: "ind-1",
      itemName: "Ibuprofen",
      safetySummary: "Generally safe when used as directed. May cause stomach irritation, especially with long-term use. Avoid if you have kidney disease or are taking blood thinners.",
      evidenceSources: ["FDA", "openFDA"]
    },
    {
      id: "ind-2",
      itemName: "Sertraline",
      safetySummary: "Common antidepressant medication. May interact with other medications that affect serotonin. Monitor for side effects, especially when starting or changing doses.",
      evidenceSources: ["FDA", "DrugBank"]
    },
    {
      id: "ind-3",
      itemName: "St. John's Wort",
      safetySummary: "Herbal supplement used for mood support. Can interact with many medications including antidepressants, birth control, and blood thinners. Consult healthcare provider before use.",
      evidenceSources: ["FDA", "AI Literature Analysis", "PubMed"]
    }
  ],
  severityBreakdown: [
    {
      source: "FDA",
      total: 12,
      severe: 2,
      moderate: 5,
      minor: 5,
      percentSevere: 16.7
    },
    {
      source: "openFDA",
      total: 8,
      severe: 1,
      moderate: 3,
      minor: 4,
      percentSevere: 12.5
    },
    {
      source: "AI Literature Analysis",
      total: 15,
      severe: 1,
      moderate: 6,
      minor: 8,
      percentSevere: 6.7
    }
  ]
}

