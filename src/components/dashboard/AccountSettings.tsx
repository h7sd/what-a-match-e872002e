import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, LogOut, Loader2, Eye, EyeOff, 
  Languages, MessageSquare, RefreshCw, Lock, ShieldCheck, ShieldOff
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
import { MFASetup } from './MFASetup';
import { MFAVerify } from './MFAVerify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountSettingsProps {
  profile: {
    username: string;
    display_name: string | null;
  } | null;
  onUpdateUsername: (username: string) => void;
  onUpdateDisplayName: (displayName: string) => void;
}

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
}

export function AccountSettings({ profile, onUpdateUsername, onUpdateDisplayName }: AccountSettingsProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showEmail, setShowEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [language, setLanguage] = useState('en');
  
  // MFA State
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [isLoadingMfa, setIsLoadingMfa] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setIsLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const verifiedFactors = data.totp.filter(f => f.status === 'verified');
      setMfaFactors(verifiedFactors);
      setIsMfaEnabled(verifiedFactors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setIsLoadingMfa(false);
    }
  };

  const handleMfaToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowMfaSetup(true);
    } else {
      setShowDisableMfa(true);
    }
  };

  const handleDisableMfa = async () => {
    setIsDisablingMfa(true);
    try {
      for (const factor of mfaFactors) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }
      setIsMfaEnabled(false);
      setMfaFactors([]);
      toast({ title: 'MFA disabled successfully' });
    } catch (error: any) {
      toast({ title: 'Failed to disable MFA', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisablingMfa(false);
      setShowDisableMfa(false);
    }
  };

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
            <div className="flex items-center gap-3">
              {isMfaEnabled ? (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              ) : (
                <Shield className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">Multi-factor authentication</p>
                <p className="text-xs text-muted-foreground">
                  {isMfaEnabled 
                    ? 'Your account is protected with 2FA' 
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            {isLoadingMfa ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Switch 
                checked={isMfaEnabled} 
                onCheckedChange={handleMfaToggle}
              />
            )}
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <FaDiscord className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">Login with Discord</p>
                <p className="text-xs text-muted-foreground">
                  Coming soon - Discord OAuth not yet available
                </p>
              </div>
            </div>
            <Switch disabled />
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
          
          <Button variant="outline" className="w-full" disabled={!isMfaEnabled}>
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

          <Button variant="outline" className="w-full opacity-50" disabled>
            <FaDiscord className="w-4 h-4 mr-2" />
            Connect Discord (Coming Soon)
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

      {/* MFA Setup Dialog */}
      <MFASetup 
        isOpen={showMfaSetup} 
        onClose={() => setShowMfaSetup(false)}
        onSuccess={() => {
          setIsMfaEnabled(true);
          checkMfaStatus();
        }}
      />

      {/* Disable MFA Confirmation */}
      <AlertDialog open={showDisableMfa} onOpenChange={setShowDisableMfa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-destructive" />
              Disable Two-Factor Authentication?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. You will no longer need to enter a code from your authenticator app when logging in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisableMfa}
              disabled={isDisablingMfa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisablingMfa ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Disable MFA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
