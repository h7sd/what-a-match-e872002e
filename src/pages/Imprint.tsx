import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FadeIn } from '@/components/landing/FadeIn';

export default function Imprint() {
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
          <h1 className="text-4xl font-bold text-foreground mb-8">Legal Notice (Imprint)</h1>
        </FadeIn>

        <div className="space-y-8 text-muted-foreground">
          <FadeIn delay={0.15}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Website Owner</h2>
              <p>Nico Faber</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.2}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Website</h2>
              <p>uservault.net</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.25}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Address</h2>
              <p>Maler Lochbiehler Straße 18</p>
              <p>87435 Kempten</p>
              <p>Germany</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.3}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Ownership</h2>
              <p>This website is owned and operated by Nico Faber.</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.35}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
              <p>Email: info@ogcomtests.com</p>
            </section>
          </FadeIn>

          <FadeIn delay={0.4}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Liability for Content</h2>
              <p>
                The contents of this website have been created with the greatest possible care. 
                However, we do not guarantee the accuracy, completeness, or timeliness of the content.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.45}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Liability for Links</h2>
              <p>
                Our website may contain links to external websites over which we have no control. 
                Therefore, we cannot accept any liability for external content. The respective 
                provider or operator of the linked pages is always responsible for their content.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.5}>
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Copyright</h2>
              <p>
                All content and works on this website are subject to German copyright law. 
                Duplication, processing, distribution, or any form of commercialization beyond 
                the scope of copyright law requires the prior written consent of the author.
              </p>
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
