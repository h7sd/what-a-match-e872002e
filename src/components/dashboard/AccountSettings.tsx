import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, LogOut, Loader2, Eye, EyeOff, 
  Languages, MessageSquare, RefreshCw, Lock, ShieldCheck, ShieldOff,
  Trash2, AlertTriangle, Hash
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { z } from 'zod';

interface AccountSettingsProps {
  profile: {
    username: string;
    display_name: string | null;
    alias_username?: string | null;
    uid_number?: number;
  } | null;
  onUpdateUsername: (username: string) => Promise<void>;
  onSaveDisplayName: (displayName: string) => Promise<void>;
  onUpdateAlias?: (alias: string | null) => Promise<void>;
}

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
}

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name cannot be empty')
  .max(32, 'Display name must be at most 32 characters');

export function AccountSettings({ profile, onUpdateUsername, onSaveDisplayName, onUpdateAlias }: AccountSettingsProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showEmail, setShowEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [language, setLanguage] = useState('en');
  
  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  
  // Alias username state (redirect)
  const [aliasUsername, setAliasUsername] = useState('');
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [aliasLastChanged, setAliasLastChanged] = useState<string | null>(null);

  type AliasAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  const [aliasAvailability, setAliasAvailability] = useState<AliasAvailability>('idle');
  const [flashAliasAvailable, setFlashAliasAvailable] = useState(false);
  const aliasCheckTimerRef = useRef<number | null>(null);

  // Username request state (to take over another user's username)
  const [usernameRequest, setUsernameRequest] = useState('');
  const [isRequestingUsername, setIsRequestingUsername] = useState(false);
  
  type UsernameRequestAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'own' | 'invalid';
  const [usernameRequestAvailability, setUsernameRequestAvailability] = useState<UsernameRequestAvailability>('idle');
  const [usernameRequestOwner, setUsernameRequestOwner] = useState<string | null>(null);
  const usernameRequestCheckTimerRef = useRef<number | null>(null);
  
  
  // MFA State
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [isLoadingMfa, setIsLoadingMfa] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCodeInput, setShowDeleteCodeInput] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [isSendingDeleteCode, setIsSendingDeleteCode] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Discord Connection State
  const [discordIntegration, setDiscordIntegration] = useState<any>(null);

  // Email Change State
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState<'input' | 'verify' | 'mfa'>('input');
  const [emailChangeCode, setEmailChangeCode] = useState('');
  const [emailChangeMfaCode, setEmailChangeMfaCode] = useState('');
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isVerifyingEmailChange, setIsVerifyingEmailChange] = useState(false);

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);

  useEffect(() => {
    setDisplayNameDraft(profile?.display_name || '');
  }, [profile?.display_name]);

  useEffect(() => {
    setAliasUsername(profile?.alias_username || '');
  }, [profile?.alias_username]);

  // Live alias availability check (debounced) - for redirect alias
  useEffect(() => {
    if (aliasCheckTimerRef.current) {
      window.clearTimeout(aliasCheckTimerRef.current);
      aliasCheckTimerRef.current = null;
    }

    const currentAlias = (profile?.alias_username || '').toLowerCase();
    const next = (aliasUsername || '').toLowerCase();

    // No change / empty
    if (!next || next === currentAlias) {
      setAliasAvailability('idle');
      return;
    }

    // Basic validation
    if (next.length < 1 || next.length > 20 || !/^[a-z0-9_]+$/.test(next)) {
      setAliasAvailability('invalid');
      return;
    }

    // Wait a moment while typing
    setAliasAvailability('checking');
    aliasCheckTimerRef.current = window.setTimeout(async () => {
      try {
        if (!user?.id) return;

        // Check if taken as username OR as someone else's alias_username
        const { data: existingProfile, error } = await supabase
          .from('profiles')
          .select('user_id, username, alias_username')
          .or(`username.eq.${next},alias_username.eq.${next}`)
          .neq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Alias availability check failed:', error);
          setAliasAvailability('idle');
          return;
        }

        if (!existingProfile) {
          setAliasAvailability('available');
          setFlashAliasAvailable(true);
          window.setTimeout(() => setFlashAliasAvailable(false), 900);
        } else {
          setAliasAvailability('taken');
        }
      } catch (e) {
        console.error('Alias availability check crashed:', e);
        setAliasAvailability('idle');
      }
    }, 450);

    return () => {
      if (aliasCheckTimerRef.current) {
        window.clearTimeout(aliasCheckTimerRef.current);
        aliasCheckTimerRef.current = null;
      }
    };
  }, [aliasUsername, profile?.alias_username, user?.id]);

  // Live username request availability check (debounced)
  useEffect(() => {
    if (usernameRequestCheckTimerRef.current) {
      window.clearTimeout(usernameRequestCheckTimerRef.current);
      usernameRequestCheckTimerRef.current = null;
    }

    const next = (usernameRequest || '').toLowerCase();
    setUsernameRequestOwner(null);

    // Empty
    if (!next) {
      setUsernameRequestAvailability('idle');
      return;
    }

    // Basic validation
    if (next.length < 1 || next.length > 20 || !/^[a-z0-9_]+$/.test(next)) {
      setUsernameRequestAvailability('invalid');
      return;
    }

    // Is it your own username?
    if (next === (profile?.username || '').toLowerCase()) {
      setUsernameRequestAvailability('own');
      return;
    }

    // Wait a moment while typing
    setUsernameRequestAvailability('checking');
    usernameRequestCheckTimerRef.current = window.setTimeout(async () => {
      try {
        if (!user?.id) return;

        // Check if someone has this as their username
        const { data: existingProfile, error } = await supabase
          .from('profiles')
          .select('user_id, username')
          .eq('username', next)
          .neq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Username request availability check failed:', error);
          setUsernameRequestAvailability('idle');
          return;
        }

        if (!existingProfile) {
          setUsernameRequestAvailability('available');
        } else {
          setUsernameRequestOwner(existingProfile.username);
          setUsernameRequestAvailability('taken');
        }
      } catch (e) {
        console.error('Username request availability check crashed:', e);
        setUsernameRequestAvailability('idle');
      }
    }, 450);

    return () => {
      if (usernameRequestCheckTimerRef.current) {
        window.clearTimeout(usernameRequestCheckTimerRef.current);
        usernameRequestCheckTimerRef.current = null;
      }
    };
  }, [usernameRequest, profile?.username, user?.id]);

  const handleRequestUsername = async () => {
    const requested = (usernameRequest || '').toLowerCase();
    if (!requested || usernameRequestAvailability !== 'taken') return;

    setIsRequestingUsername(true);
    try {
      const { data, error } = await supabase.functions.invoke('alias-request', {
        body: {
          action: 'create',
          requestedAlias: requested,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: 'Request sent', description: `@${usernameRequestOwner || requested} will receive an email.` });
        setUsernameRequest('');
      } else {
        throw new Error(data?.error || 'Request failed');
      }
    } catch (e: any) {
      toast({ title: 'Request failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsRequestingUsername(false);
    }
  };

  const handleSaveAlias = async () => {
    if (!onUpdateAlias || aliasAvailability !== 'available') return;

    // Check 7-day cooldown
    if (aliasLastChanged) {
      const lastChanged = new Date(aliasLastChanged);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastChanged > sevenDaysAgo) {
        const nextAllowedDate = new Date(lastChanged);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 7);
        const daysRemaining = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        toast({ 
          title: 'Alias change limit', 
          description: `You can change your alias again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsSavingAlias(true);
    try {
      await onUpdateAlias(aliasUsername || null);
      setAliasLastChanged(new Date().toISOString());
    } finally {
      setIsSavingAlias(false);
    }
  };


  useEffect(() => {
    checkMfaStatus();
    fetchDiscordIntegration();
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

  const fetchDiscordIntegration = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('discord_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setDiscordIntegration(data);
      }
    } catch (error) {
      console.error('Error fetching discord integration:', error);
    }
  };

  // Discord connection is disabled - Coming Soon

  const handleDisconnectDiscord = async () => {
    try {
      const { error } = await supabase
        .from('discord_integrations')
        .delete()
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setDiscordIntegration(null);
      toast({ title: 'Discord disconnected successfully' });
    } catch (error: any) {
      toast({ title: 'Failed to disconnect Discord', variant: 'destructive' });
    }
  };

  const handleDeleteAccountRequest = async () => {
    setShowDeleteConfirm(false);
    setIsSendingDeleteCode(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'send-code' }
      });
      
      if (error) throw error;
      
      toast({ title: 'Verification code sent to your email' });
      setShowDeleteCodeInput(true);
    } catch (error: any) {
      console.error('Error sending delete code:', error);
      toast({ 
        title: 'Failed to send verification code', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSendingDeleteCode(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteCode.length !== 6) {
      toast({ title: 'Please enter the 6-digit code', variant: 'destructive' });
      return;
    }
    
    setIsDeletingAccount(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'verify-and-delete', code: deleteCode }
      });
      
      if (error) throw error;
      
      toast({ title: 'Account deleted successfully' });
      setShowDeleteCodeInput(false);
      
      // Sign out and redirect
      await signOut();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({ 
        title: 'Failed to delete account', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Email Change Handlers
  const handleSendEmailChangeCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setIsSendingEmailCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-change-code', {
        body: { newEmail }
      });

      if (error) throw error;

      toast({ title: 'Verification code sent to your current email' });
      setEmailChangeStep('verify');
    } catch (error: any) {
      console.error('Error sending email change code:', error);
      toast({ 
        title: 'Failed to send verification code', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (emailChangeCode.length !== 6) {
      toast({ title: 'Please enter the 6-digit code', variant: 'destructive' });
      return;
    }

    // Check if user has MFA enabled - if so, require MFA code
    if (isMfaEnabled) {
      setEmailChangeStep('mfa');
      return;
    }

    // Proceed with email change
    await completeEmailChange();
  };

  const handleMfaVerifyForEmailChange = async () => {
    if (emailChangeMfaCode.length !== 6) {
      toast({ title: 'Please enter the 6-digit MFA code', variant: 'destructive' });
      return;
    }

    // Verify MFA code
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    if (!factorsData?.totp.length) {
      toast({ title: 'No MFA factor found', variant: 'destructive' });
      return;
    }

    const factor = factorsData.totp.find(f => f.status === 'verified');
    if (!factor) {
      toast({ title: 'No verified MFA factor found', variant: 'destructive' });
      return;
    }

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: emailChangeMfaCode
      });

      if (verifyError) throw verifyError;

      // MFA verified, proceed with email change
      await completeEmailChange();
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast({ 
        title: 'Invalid MFA code', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const completeEmailChange = async () => {
    setIsVerifyingEmailChange(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-change', {
        body: { code: emailChangeCode, newEmail }
      });

      if (error) throw error;

      toast({ title: 'Email changed successfully! Please log in again.' });
      resetEmailChangeDialog();
      
      // Sign out since email changed
      await signOut();
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast({ 
        title: 'Failed to change email', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsVerifyingEmailChange(false);
    }
  };

  const resetEmailChangeDialog = () => {
    setShowEmailChangeDialog(false);
    setNewEmail('');
    setEmailChangeStep('input');
    setEmailChangeCode('');
    setEmailChangeMfaCode('');
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
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <User className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                  placeholder="username"
                  maxLength={20}
                />
              </div>
              {newUsername !== profile?.username && newUsername.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={async () => {
                    setIsSavingUsername(true);
                    try {
                      await onUpdateUsername(newUsername);
                    } finally {
                      setIsSavingUsername(false);
                    }
                  }}
                  disabled={isSavingUsername}
                >
                  {isSavingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">1-20 characters, letters, numbers, underscores only</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Display Name</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <User className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                  placeholder="Display Name"
                  maxLength={32}
                />
              </div>

              {displayNameDraft !== (profile?.display_name || '') && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const parsed = displayNameSchema.safeParse(displayNameDraft);
                    if (!parsed.success) {
                      toast({ title: parsed.error.issues[0]?.message || 'Invalid display name', variant: 'destructive' });
                      return;
                    }

                    setIsSavingDisplayName(true);
                    try {
                      await onSaveDisplayName(parsed.data);
                    } finally {
                      setIsSavingDisplayName(false);
                    }
                  }}
                  disabled={isSavingDisplayName}
                >
                  {isSavingDisplayName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
            
          </div>

          {/* Username Request - to take over another user's username */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Username Request</label>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border transition-colors"
                )}
              >
                <span className="text-muted-foreground">@</span>
                <Input
                  value={usernameRequest}
                  onChange={(e) => setUsernameRequest(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                  placeholder="username-to-request"
                  maxLength={20}
                />
              </div>

              {/* Request if taken (username exists) */}
              {usernameRequest && usernameRequestAvailability === 'taken' && (
                <Button size="sm" onClick={handleRequestUsername} disabled={isRequestingUsername}>
                  {isRequestingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request'}
                </Button>
              )}

              {/* Busy indicator */}
              {usernameRequest && usernameRequestAvailability === 'checking' && (
                <Button size="sm" variant="secondary" disabled>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </Button>
              )}
            </div>

            {/* Availability hint */}
            {usernameRequest && (
              <div className="text-xs">
                {usernameRequestAvailability === 'available' && (
                  <span className="text-muted-foreground">
                    This username is not taken – you can change your username directly above.
                  </span>
                )}
                {usernameRequestAvailability === 'taken' && (
                  <span className="text-muted-foreground">
                    Taken by <span className="text-primary">@{usernameRequestOwner}</span> – you can send a request.
                  </span>
                )}
                {usernameRequestAvailability === 'own' && (
                  <span className="text-muted-foreground">This is already your username.</span>
                )}
                {usernameRequestAvailability === 'invalid' && (
                  <span className="text-destructive">Invalid (1–20 characters, a-z, 0-9, _)</span>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Request to take over another user's username. You can request once every 15 days.
            </p>
          </div>

          {/* Alias (Redirect) - free handle for redirect */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Alias (Redirect)</label>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border transition-colors",
                  flashAliasAvailable && "alias-available-flash border-success/60 ring-2 ring-success/20"
                )}
              >
                <span className="text-muted-foreground">@</span>
                <Input
                  value={aliasUsername}
                  onChange={(e) => setAliasUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                  placeholder="redirect-handle"
                  maxLength={20}
                />
              </div>

              {/* Save if available */}
              {aliasUsername !== (profile?.alias_username || '') && onUpdateAlias && aliasAvailability === 'available' && (
                <Button 
                  size="sm" 
                  onClick={handleSaveAlias}
                  disabled={isSavingAlias}
                >
                  {isSavingAlias ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              )}

              {/* Busy indicator */}
              {aliasUsername !== (profile?.alias_username || '') && aliasAvailability === 'checking' && (
                <Button size="sm" variant="secondary" disabled>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </Button>
              )}

              {aliasUsername && onUpdateAlias && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={async () => {
                    setIsSavingAlias(true);
                    try {
                      await onUpdateAlias(null);
                      setAliasUsername('');
                    } finally {
                      setIsSavingAlias(false);
                    }
                  }}
                  disabled={isSavingAlias}
                >
                  Remove
                </Button>
              )}
            </div>

            {/* Availability hint */}
            {aliasUsername !== (profile?.alias_username || '') && (
              <div className="text-xs">
                {aliasAvailability === 'available' && <span className="text-success">Available</span>}
                {aliasAvailability === 'taken' && (
                  <span className="text-destructive">
                    Already taken – aliases must be unique.
                  </span>
                )}
                {aliasAvailability === 'invalid' && <span className="text-destructive">Invalid (1–20 characters, a-z, 0-9, _)</span>}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Visitors to /{aliasUsername || 'alias'} will be redirected to /{profile?.username}. You can change this once every 7 days.
            </p>
          </div>

          {/* UID Number - Read Only for users */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">UID (Registration Number)</label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">#{profile?.uid_number || '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your unique registration number. Contact an admin to change this.
            </p>
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

          <Button 
            variant="outline" 
            className="w-full text-primary"
            onClick={() => setShowEmailChangeDialog(true)}
          >
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

          {discordIntegration ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDisconnectDiscord}
            >
              <FaDiscord className="w-4 h-4 mr-2 text-[#5865F2]" />
              Disconnect Discord (@{discordIntegration.username})
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full opacity-60 cursor-not-allowed"
              disabled={true}
            >
              <FaDiscord className="w-4 h-4 mr-2 text-[#5865F2]" />
              Coming Soon
            </Button>
          )}

          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>

          <div className="border-t border-border pt-4 mt-4">
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
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

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Your Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action is <strong>permanent</strong> and cannot be undone.</p>
              <p>All your data will be deleted including:</p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Your profile and all customizations</li>
                <li>All social links</li>
                <li>Badges and achievements</li>
                <li>View statistics</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccountRequest}
              disabled={isSendingDeleteCode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSendingDeleteCode ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Send Verification Code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Code Input */}
      <Dialog open={showDeleteCodeInput} onOpenChange={setShowDeleteCodeInput}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              We've sent a 6-digit verification code to your email. Enter it below to permanently delete your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={deleteCode}
              onChange={setDeleteCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">Code expires in 15 minutes</p>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCodeInput(false);
                setDeleteCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteAccount}
              disabled={isDeletingAccount || deleteCode.length !== 6}
            >
              {isDeletingAccount ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={showEmailChangeDialog} onOpenChange={(open) => !open && resetEmailChangeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Change Email Address
            </DialogTitle>
            <DialogDescription>
              {emailChangeStep === 'input' && 'Enter your new email address. A verification code will be sent to your current email.'}
              {emailChangeStep === 'verify' && 'Enter the 6-digit verification code sent to your current email.'}
              {emailChangeStep === 'mfa' && 'Enter your 2FA code from your authenticator app to confirm the email change.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {emailChangeStep === 'input' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Email</label>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Email</label>
                  <Input
                    type="email"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {emailChangeStep === 'verify' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-center text-muted-foreground">
                  We sent a code to <strong>{user?.email}</strong>
                </p>
                <InputOTP
                  maxLength={6}
                  value={emailChangeCode}
                  onChange={setEmailChangeCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">Code expires in 15 minutes</p>
              </div>
            )}

            {emailChangeStep === 'mfa' && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-center">Two-Factor Authentication Required</p>
                </div>
                <InputOTP
                  maxLength={6}
                  value={emailChangeMfaCode}
                  onChange={setEmailChangeMfaCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">Enter the code from your authenticator app</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={resetEmailChangeDialog}>
              Cancel
            </Button>
            {emailChangeStep === 'input' && (
              <Button 
                onClick={handleSendEmailChangeCode} 
                disabled={isSendingEmailCode || !newEmail}
              >
                {isSendingEmailCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Code
              </Button>
            )}
            {emailChangeStep === 'verify' && (
              <Button 
                onClick={handleVerifyEmailChange} 
                disabled={emailChangeCode.length !== 6}
              >
                {isMfaEnabled ? 'Continue' : 'Change Email'}
              </Button>
            )}
            {emailChangeStep === 'mfa' && (
              <Button 
                onClick={handleMfaVerifyForEmailChange} 
                disabled={isVerifyingEmailChange || emailChangeMfaCode.length !== 6}
              >
                {isVerifyingEmailChange ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Change
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
