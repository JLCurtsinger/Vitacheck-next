import Link from "next/link"

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-1 items-start justify-center bg-white py-8 sm:py-12">
      <article className="container mx-auto px-4 max-w-3xl w-full">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Terms and Conditions for Vitacheck
          </h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Effective Date:</strong> Feb. 16, 2025
            </p>
            <p>
              <strong>Last Updated:</strong> Feb. 16, 2025
            </p>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-sm sm:prose-base max-w-none space-y-6">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              1. Introduction
            </h2>
            <p className="mb-4">
              Welcome to Vitacheck (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using
              our website, you agree to be bound by these Terms and Conditions
              (&quot;Terms&quot;).
            </p>
            <div className="border-l-4 border-destructive bg-destructive/10 p-4 my-4 rounded-r">
              <p className="font-semibold mb-2">Important Disclaimer:</p>
              <p>
                Vitacheck is an informational tool only and does not provide
                medical advice. The information presented on this site may be
                incomplete, inaccurate, or outdated. Always consult a licensed
                healthcare provider before making any medication or supplement
                decisions.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              2. Acceptance of Terms
            </h2>
            <p className="mb-4">
              By using Vitacheck, you acknowledge that you have read, understood,
              and agree to be bound by these Terms. If you do not agree to these
              Terms, please do not use our website.
            </p>
            <p>
              We reserve the right to modify these Terms at any time. Your
              continued use of Vitacheck after any such changes constitutes your
              acceptance of the new Terms.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              3. No Medical Advice
            </h2>
            <p className="mb-4">
              Vitacheck does not provide medical advice, diagnosis, or treatment.
              The content on this website is for informational purposes only.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Our interaction checker is not a substitute for professional
                medical advice.
              </li>
              <li>
                We do not guarantee the accuracy, completeness, or reliability of
                any information.
              </li>
              <li>
                Always consult with a qualified healthcare provider before
                starting, stopping, or changing any medication regimen.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              4. Limitation of Liability
            </h2>
            <p className="mb-4">
              To the maximum extent permitted by law, Vitacheck and its
              operators, affiliates, and partners shall not be liable for:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Any direct, indirect, incidental, consequential, or punitive
                damages arising from your use of this website.
              </li>
              <li>
                Any harm resulting from reliance on information provided by
                Vitacheck.
              </li>
              <li>Any errors, omissions, or inaccuracies in the content.</li>
              <li>
                Any decision made or action taken based on the information
                provided.
              </li>
            </ul>
            <p>
              By using Vitacheck, you expressly agree that your use is at your
              sole risk.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              5. Third-Party Content and Links
            </h2>
            <p className="mb-4">
              Vitacheck may contain links to third-party websites or content from
              external sources (including RxNorm, SUPP.AI, and other medical
              databases).
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                We do not control, endorse, or assume responsibility for any
                third-party content.
              </li>
              <li>
                The inclusion of any link does not imply our endorsement of the
                linked site.
              </li>
              <li>
                Use of third-party websites is subject to their terms and
                conditions.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              6. Intellectual Property
            </h2>
            <p className="mb-4">
              All content on Vitacheck, including text, graphics, logos, and
              software, is the property of Vitacheck or its content suppliers and
              is protected by copyright and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, or create derivative
              works from any content without our express written permission.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              7. User Conduct
            </h2>
            <p className="mb-4">
              When using Vitacheck, you agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Use the website for any unlawful purpose.</li>
              <li>
                Attempt to gain unauthorized access to any part of the website.
              </li>
              <li>Interfere with the proper functioning of the website.</li>
              <li>Collect or harvest any information from the website.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              8. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Vitacheck, its
              operators, affiliates, and partners from and against any claims,
              liabilities, damages, losses, costs, expenses, or fees (including
              reasonable attorneys&apos; fees) arising from your violation of these
              Terms or your use of the website.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              9. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the United States, without regard to its conflict of
              law principles.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              10. Contact Information
            </h2>
            <p className="mb-2">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="space-y-1 mb-4">
              <p>Admin@Vitacheck.cc</p>
              <p>Vitacheck.cc</p>
            </div>
            <p className="mb-4">
              By using Vitacheck, you acknowledge that you have read, understood,
              and agreed to these Terms and Conditions. If you do not agree,
              please discontinue use immediately.
            </p>
            <p className="font-semibold mb-4">
              Always consult a licensed healthcare professional before making any
              medication decisions.
            </p>
            <p>
              Please also review our{" "}
              <Link
                href="/privacy-policy"
                className="text-primary underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              for information on how we handle data.
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}

