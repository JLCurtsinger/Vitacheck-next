export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 items-start justify-center bg-white py-8 sm:py-12">
      <article className="container mx-auto px-4 max-w-3xl w-full">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Privacy Policy for Vitacheck
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
              Welcome to Vitacheck (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). Your privacy is
              important to us, and we are committed to protecting any
              information you may provide while using our website.
            </p>
            <div className="border-l-4 border-destructive bg-destructive/10 p-4 my-4 rounded-r">
              <p className="font-semibold mb-2">Important Disclaimer:</p>
              <p className="mb-2">
                Vitacheck is an informational tool only and does not provide
                medical advice. The information presented on this site may be
                incomplete, inaccurate, or outdated. Always consult a licensed
                healthcare provider before making any medication or supplement
                decisions.
              </p>
              <p>
                By using Vitacheck, you acknowledge and agree that we are not
                liable for any harm, injury, or death resulting from reliance
                on information provided by this website.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <p className="mb-4">
              Vitacheck does not require users to create an account or submit
              personal identifying information. However, we may collect the
              following non-personal data to improve our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Medication & Supplement Queries:</strong> When you enter
                a medication or supplement name, we process this data to retrieve
                interaction information.
              </li>
              <li>
                <strong>Analytics & Usage Data:</strong> We may collect
                anonymized usage data (e.g., page visits, queries, error reports)
                to enhance site functionality.
              </li>
              <li>
                <strong>Cookies:</strong> We may use cookies to improve user
                experience, but we do not track personal data.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              3. How We Use Information
            </h2>
            <p className="mb-4">
              Vitacheck processes medication and supplement queries to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Retrieve potential interaction information from third-party APIs
                (RxNorm, SUPP.AI, openFDA, etc.).
              </li>
              <li>
                Display potential risk levels based on available data.
              </li>
              <li>
                Improve the accuracy and functionality of our platform.
              </li>
            </ul>
            <p>
              We do not sell, share, or store user queries for any marketing or
              commercial purposes.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              4. Third-Party API Use & Limitations
            </h2>
            <p className="mb-4">
              Vitacheck relies on external sources (e.g., RxNorm, SUPP.AI,
              openFDA) to retrieve medication interaction data. We do not
              control or verify the accuracy of these sources.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Information from these APIs may be incomplete, inaccurate, or
                outdated.
              </li>
              <li>
                API errors or limitations may result in missing or incorrect
                interaction warnings.
              </li>
              <li>
                Some interactions may not be detected due to gaps in available
                medical data.
              </li>
              <li>
                If Vitacheck fails to detect a known interaction, you must
                consult a healthcare professional immediately.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              5. No Medical Advice – Use at Your Own Risk
            </h2>
            <p className="mb-4">
              Vitacheck does not provide medical advice, nor does it replace
              professional healthcare consultation.
            </p>
            <p className="mb-4">
              By using Vitacheck, you understand and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>The results may be incorrect, incomplete, or misleading.</li>
              <li>
                We do not guarantee that all dangerous drug interactions will be
                detected.
              </li>
              <li>
                You must not make medication decisions based solely on
                information from Vitacheck.
              </li>
            </ul>
            <p>
              Vitacheck is for informational purposes only. You must consult a
              licensed medical professional before starting, stopping, or
              combining any medications or supplements.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              6. Limitation of Liability
            </h2>
            <p className="mb-4">
              Under no circumstances shall Vitacheck, its developers,
              affiliates, or partners be liable for any direct, indirect,
              incidental, or consequential damages, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                Personal injury, illness, or death caused by reliance on our
                data.
              </li>
              <li>
                Medical errors due to incomplete or incorrect interaction
                information.
              </li>
              <li>
                Missed interactions that were not flagged due to API limitations.
              </li>
              <li>
                Losses resulting from inaccurate or outdated information.
              </li>
            </ul>
            <p>
              By using this website, you agree to hold Vitacheck harmless from
              any claims, damages, or legal disputes arising from the use of this
              tool.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              7. Security Measures
            </h2>
            <p className="mb-4">
              We take reasonable precautions to protect your information, but no
              website is 100% secure.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Vitacheck does not store sensitive medical data.</li>
              <li>We do not collect personally identifiable information.</li>
              <li>
                We use standard security protocols to protect user queries.
              </li>
            </ul>
            <p>
              However, we cannot guarantee the security of data transmitted over
              the internet. Use Vitacheck at your own risk.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. If changes
              occur, the &quot;Last Updated&quot; date at the top of this page will be
              revised. Continued use of Vitacheck after policy updates
              constitutes acceptance of the changes.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
              9. Contact Information
            </h2>
            <p className="mb-2">
              If you have any concerns or questions about this Privacy Policy,
              you may contact us at:
            </p>
            <div className="space-y-1 mb-4">
              <p>Admin@Vitacheck.cc</p>
              <p>Vitacheck.cc</p>
            </div>
            <p className="mb-4">
              By using Vitacheck, you acknowledge that you have read, understood,
              and agreed to this Privacy Policy. If you do not agree, please
              discontinue use immediately.
            </p>
            <p className="font-semibold">
              Always consult a licensed healthcare professional before making any
              medication decisions.
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}

