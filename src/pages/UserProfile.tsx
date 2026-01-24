import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useProfileByUsername, useSocialLinks, useBadges, useRecordProfileView } from '@/hooks/useProfile';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { BackgroundEffects } from '@/components/profile/BackgroundEffects';
import { MusicPlayer } from '@/components/profile/MusicPlayer';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useProfileByUsername(username || '');
  const { data: socialLinks = [] } = useSocialLinks(profile?.id || '');
  const { data: badges = [] } = useBadges(profile?.id || '');
  const recordView = useRecordProfileView();

  // Record profile view
  useEffect(() => {
    if (profile?.id) {
      recordView.mutate(profile.id);
    }
  }, [profile?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-muted-foreground mb-6">User not found</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundEffects
        backgroundUrl={profile.background_url}
        backgroundColor={profile.background_color}
        accentColor={profile.accent_color}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-6"
        >
          <ProfileCard profile={profile} badges={badges} />

          {profile.music_url && (
            <MusicPlayer url={profile.music_url} accentColor={profile.accent_color || undefined} />
          )}

          {socialLinks.length > 0 && (
            <SocialLinks links={socialLinks} accentColor={profile.accent_color || undefined} />
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Link
            to="/"
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Create your own bio page →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
