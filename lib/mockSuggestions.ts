export type SuggestionItem = {
  id: string
  label: string
  kind: "medication" | "supplement"
  synonyms?: string[]
}

export const mockSuggestions: SuggestionItem[] = [
  // Medications
  {
    id: "ibuprofen",
    label: "Ibuprofen",
    kind: "medication",
    synonyms: ["Advil", "Motrin", "Nurofen"],
  },
  {
    id: "sertraline",
    label: "Sertraline",
    kind: "medication",
    synonyms: ["Zoloft"],
  },
  {
    id: "omeprazole",
    label: "Omeprazole",
    kind: "medication",
    synonyms: ["Prilosec"],
  },
  {
    id: "aspirin",
    label: "Aspirin",
    kind: "medication",
    synonyms: ["Bayer", "Ecotrin"],
  },
  {
    id: "acetaminophen",
    label: "Acetaminophen",
    kind: "medication",
    synonyms: ["Tylenol", "Paracetamol"],
  },
  {
    id: "metformin",
    label: "Metformin",
    kind: "medication",
    synonyms: ["Glucophage"],
  },
  {
    id: "atorvastatin",
    label: "Atorvastatin",
    kind: "medication",
    synonyms: ["Lipitor"],
  },
  {
    id: "lisinopril",
    label: "Lisinopril",
    kind: "medication",
    synonyms: ["Prinivil", "Zestril"],
  },
  {
    id: "amoxicillin",
    label: "Amoxicillin",
    kind: "medication",
    synonyms: ["Amoxil"],
  },
  {
    id: "levothyroxine",
    label: "Levothyroxine",
    kind: "medication",
    synonyms: ["Synthroid", "Levoxyl"],
  },
  // Supplements
  {
    id: "magnesium",
    label: "Magnesium",
    kind: "supplement",
    synonyms: ["Mg", "Magnesium citrate", "Magnesium oxide"],
  },
  {
    id: "st-johns-wort",
    label: "St. John's Wort",
    kind: "supplement",
    synonyms: ["Hypericum", "SJW"],
  },
  {
    id: "melatonin",
    label: "Melatonin",
    kind: "supplement",
    synonyms: [],
  },
  {
    id: "vitamin-d",
    label: "Vitamin D",
    kind: "supplement",
    synonyms: ["Cholecalciferol", "D3", "Calcitriol"],
  },
  {
    id: "omega-3",
    label: "Omega-3",
    kind: "supplement",
    synonyms: ["Fish oil", "EPA", "DHA"],
  },
  {
    id: "vitamin-c",
    label: "Vitamin C",
    kind: "supplement",
    synonyms: ["Ascorbic acid"],
  },
  {
    id: "zinc",
    label: "Zinc",
    kind: "supplement",
    synonyms: ["Zinc gluconate", "Zinc sulfate"],
  },
  {
    id: "calcium",
    label: "Calcium",
    kind: "supplement",
    synonyms: ["Calcium carbonate", "Calcium citrate"],
  },
  {
    id: "iron",
    label: "Iron",
    kind: "supplement",
    synonyms: ["Ferrous sulfate", "Iron bisglycinate"],
  },
  {
    id: "b12",
    label: "Vitamin B12",
    kind: "supplement",
    synonyms: ["Cobalamin", "Methylcobalamin"],
  },
]

/**
 * Filter suggestions based on search query.
 * Matches against label and synonyms (case-insensitive).
 */
export function filterSuggestions(
  query: string,
  suggestions: SuggestionItem[]
): SuggestionItem[] {
  if (!query.trim()) {
    return suggestions
  }

  const lowerQuery = query.toLowerCase().trim()

  return suggestions.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(lowerQuery)
    const synonymMatch = item.synonyms?.some((syn) =>
      syn.toLowerCase().includes(lowerQuery)
    )
    return labelMatch || synonymMatch
  })
}

