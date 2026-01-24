import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { ArrowRight, Sparkles, Zap, Globe, Music } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: 'Stunning Effects',
      description: 'Sparkles, glows, tilt effects, and more to make your page unique.',
    },
    {
      icon: Music,
      title: 'Profile Music',
      description: 'Add background music to your page for an immersive experience.',
    },
    {
      icon: Globe,
      title: 'Social Links',
      description: 'Connect all your socials in one beautiful, shareable page.',
    },
    {
      icon: Zap,
      title: 'Live Integrations',
      description: 'Show your Spotify activity, Discord status, and more.',
    },
  ];

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <header className="p-6 flex justify-between items-center max-w-6xl mx-auto">
          <Link to="/" className="text-xl font-bold gradient-text">
            feds.lol
          </Link>
          <div className="flex gap-3">
            {user ? (
              <Button asChild variant="default">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Hero */}
        <main className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">One link</span>
              <br />
              <span className="text-white">for everything</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Create your personalized bio page with stunning effects, social links,
              music, and live integrations. Share who you are with the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/auth">
                  Create Your Page
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8">
                <Link to="/demo">See Demo</Link>
              </Button>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="glass-card-hover p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Example Profiles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-24 text-center"
          >
            <p className="text-muted-foreground mb-4">Trusted by thousands of creators</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {['yourname.feds.lol', 'artist.feds.lol', 'gamer.feds.lol'].map((url) => (
                <span
                  key={url}
                  className="px-4 py-2 glass rounded-full text-sm text-muted-foreground"
                >
                  {url}
                </span>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 feds.lol clone. Built with Lovable.
          </p>
        </footer>
      </div>
    </div>
  );
}
