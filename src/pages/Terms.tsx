import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FadeIn } from '@/components/landing/FadeIn';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <FadeIn>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        </FadeIn>

        <div className="space-y-8 text-muted-foreground">
          <FadeIn delay={0.15}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using UserVault (uservault.net), you agree to be bound by these 
                Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.2}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p>
                UserVault provides a platform for creating personalized bio pages with social links, 
                profile customization, and various integrations. We reserve the right to modify, 
                suspend, or discontinue any part of our services at any time.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.25}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
              <p className="mb-2">When creating an account, you agree to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>
          </FadeIn>

          <FadeIn delay={0.3}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use the service for any illegal purposes</li>
                <li>Upload harmful, offensive, or inappropriate content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Impersonate others or misrepresent your identity</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>
          </FadeIn>

          <FadeIn delay={0.35}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Content Ownership</h2>
              <p>
                You retain ownership of the content you upload. By using our service, you grant us 
                a license to display, store, and distribute your content as necessary to provide 
                our services.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.4}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your account at any time for violations 
                of these terms or for any other reason at our sole discretion. You may also delete 
                your account at any time through your account settings.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.45}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Disclaimer of Warranties</h2>
              <p>
                Our services are provided "as is" without warranties of any kind, either express 
                or implied. We do not guarantee that the service will be uninterrupted, secure, 
                or error-free.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.5}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages arising from your use 
                of our services.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.55}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to Terms</h2>
              <p>
                We may update these terms from time to time. Continued use of the service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.6}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact</h2>
              <p>
                For questions about these terms, please contact us at info@ogcomtests.com.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.65}>
            <section>
              <p className="text-sm">Last updated: January 2026</p>
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
