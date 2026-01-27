import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FadeIn } from '@/components/landing/FadeIn';

export default function Privacy() {
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
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        </FadeIn>

        <div className="space-y-8 text-muted-foreground">
          <FadeIn delay={0.15}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                We take the protection of your personal data very seriously. This privacy policy 
                informs you about how we handle your personal data when you use our website 
                uservault.net.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.2}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Data Controller</h2>
              <p>Nico Faber</p>
              <p>Maler Lochbiehler Straße 18</p>
              <p>87435 Kempten, Germany</p>
              <p className="mt-2">Email: info@ogcomtests.com</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.25}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Data We Collect</h2>
              <p className="mb-2">When you use our services, we may collect:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Account information (email, username, password)</li>
                <li>Profile information you choose to provide</li>
                <li>Usage data and analytics</li>
                <li>Technical data (IP address, browser type, device information)</li>
              </ul>
            </section>
          </FadeIn>

          <FadeIn delay={0.3}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. How We Use Your Data</h2>
              <p className="mb-2">We use your data to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide and maintain our services</li>
                <li>Personalize your experience</li>
                <li>Communicate with you about our services</li>
                <li>Improve our website and services</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>
          </FadeIn>

          <FadeIn delay={0.35}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Storage</h2>
              <p>
                Your data is stored securely on servers within the European Union. We implement 
                appropriate technical and organizational measures to protect your personal data.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.4}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
              <p className="mb-2">Under GDPR, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Access your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Restrict processing of your data</li>
                <li>Data portability</li>
                <li>Object to processing</li>
              </ul>
            </section>
          </FadeIn>

          <FadeIn delay={0.45}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies</h2>
              <p>
                We use essential cookies to ensure the proper functioning of our website. 
                These cookies are necessary for basic website functionality and cannot be disabled.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.5}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
              <p>
                If you have any questions about this privacy policy or our data practices, 
                please contact us at info@ogcomtests.com.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.55}>
            <section>
              <p className="text-sm">Last updated: January 2026</p>
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
