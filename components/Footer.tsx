import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-neutral-900 text-neutral-300">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Disclaimer */}
          <p className="text-sm max-w-2xl text-neutral-400">
            This tool is for informational purposes only and is not a substitute
            for professional medical advice. Always consult with a healthcare
            provider before making any changes to your medication regimen.
          </p>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/privacy-policy"
              className="text-sm text-neutral-300 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-sm text-neutral-300 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Terms and Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

