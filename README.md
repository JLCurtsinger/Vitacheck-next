# Vitacheck Landing Page

A drug and supplement interaction checker landing page built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Hero Section**: Clear headline and subtitle explaining the tool
- **Multi-Item Input**: Chip-based input with always-open search
- **Keyboard Navigation**: Full keyboard support (Arrow keys, Enter, Esc, Backspace)
- **Quick Add Examples**: Fast path for common medications and supplements
- **Accessibility**: ARIA labels, focus management, and screen reader support
- **Mobile-First**: Responsive design with touch-friendly targets (≥44px)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── results/
│   │   └── page.tsx        # Results page (placeholder)
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   └── popover.tsx
│   └── MultiItemCombobox.tsx  # Main input component
├── lib/
│   ├── utils.ts            # Utility functions (cn)
│   └── mockSuggestions.ts  # Mock data and filtering logic
└── package.json
```

## Swapping Mock Suggestions for Real API

Currently, suggestions are loaded from `lib/mockSuggestions.ts`. To integrate with a real API:

### Option 1: Replace the filter function

1. Update `lib/mockSuggestions.ts`:
   - Keep the `SuggestionItem` type
   - Replace `filterSuggestions` to call your API
   - Update `mockSuggestions` to be an empty array or remove it

2. Modify the filtering logic in `components/MultiItemCombobox.tsx`:
   - Change the `useEffect` that calls `filterSuggestions` to make an API call instead
   - Use `fetch` or your preferred HTTP client
   - Handle loading and error states

Example:
```typescript
React.useEffect(() => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current)
  }

  debounceTimerRef.current = setTimeout(async () => {
    try {
      const response = await fetch(`/api/suggestions?q=${encodeURIComponent(inputValue)}`)
      const data = await response.json()
      const available = data.filter(
        (item: SuggestionItem) => !items.some((selected) => selected.id === item.id)
      )
      setFilteredSuggestions(available)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setFilteredSuggestions([])
    }
    setHighlightedIndex(-1)
  }, 250)

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }
}, [inputValue, items])
```

### Option 2: Create an API route

1. Create `app/api/suggestions/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  
  // Call your external API or database
  const suggestions = await fetchFromYourAPI(query)
  
  return NextResponse.json(suggestions)
}
```

2. Update `MultiItemCombobox.tsx` to call `/api/suggestions?q=${inputValue}`

### Important Notes

- The debounce delay (250ms) is already in place, so API calls won't fire on every keystroke
- The component filters out already-selected items client-side, which you may want to handle server-side
- Ensure your API returns data matching the `SuggestionItem` type:
  ```typescript
  {
    id: string
    label: string
    kind: "medication" | "supplement"
    synonyms?: string[]
  }
  ```

## Accessibility Features

- Visible focus rings on all interactive elements
- ARIA labels and roles for screen readers
- Keyboard navigation (Arrow keys, Enter, Esc, Backspace)
- Minimum 44px tap targets for mobile
- Semantic HTML structure

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (Radix UI primitives)
- **Lucide React** (Icons)

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

