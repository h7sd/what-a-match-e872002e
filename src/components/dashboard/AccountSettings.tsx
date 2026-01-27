import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, LogOut, Loader2, Eye, EyeOff, 
  Languages, MessageSquare, RefreshCw, Lock
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountSettingsProps {
  profile: {
    username: string;
    display_name: string | null;
  } | null;
  onUpdateUsername: (username: string) => void;
  onUpdateDisplayName: (displayName: string) => void;
}

export function AccountSettings({ profile, onUpdateUsername, onUpdateDisplayName }: AccountSettingsProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showEmail, setShowEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [language, setLanguage] = useState('en');

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully!' });
      setNewPassword('');
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const maskedEmail = user?.email 
    ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center"
      >
        Account Settings
      </motion.h1>

      {/* General Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">General Information</h2>
        <div className="glass-card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Username</label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                value={profile?.username || ''}
                onChange={(e) => onUpdateUsername(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Display Name</label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                value={profile?.display_name || ''}
                onChange={(e) => onUpdateDisplayName(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Display Name"
              />
            </div>
            <p className="text-xs text-primary">Want more? Unlock with Premium</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{showEmail ? user?.email : maskedEmail}</span>
              <button onClick={() => setShowEmail(!showEmail)} className="text-muted-foreground hover:text-foreground">
                {showEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Language Settings</h2>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-3">Choose the language you want to use.</p>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>🇺🇸</span>
                  <span>English (US)</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇺🇸 English (US)</SelectItem>
              <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
              <SelectItem value="fr">🇫🇷 Français</SelectItem>
              <SelectItem value="es">🇪🇸 Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Discord Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Discord Settings</h2>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Claim your badges and perks as roles on the official Discord server
          </p>
          <Button variant="outline" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Claim Now
          </Button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Security Settings</h2>
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Multi-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Multi-factor authentication adds a layer of security to your account
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Login with Discord</p>
              <p className="text-xs text-muted-foreground">
                Lets you sign in to your account with Discord
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Account Actions</h2>
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Recovery codes are one-time use. Used codes can't be reused.
          </p>
          
          <Button variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Recovery Codes
          </Button>

          <Button variant="outline" className="w-full text-primary">
            <Mail className="w-4 h-4 mr-2" />
            Change Email
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              By changing your password, you will be logged out of every device.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <FaDiscord className="w-4 h-4 mr-2" />
            Connect Discord
          </Button>

          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
