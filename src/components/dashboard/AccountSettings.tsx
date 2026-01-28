import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Shield, Key, LogOut, Loader2, Eye, EyeOff, 
  Languages, MessageSquare, RefreshCw, Lock, ShieldCheck, ShieldOff,
  Trash2, AlertTriangle
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
  
  // Alias username state
  const [aliasUsername, setAliasUsername] = useState('');
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  
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
  const [isConnectingDiscord, setIsConnectingDiscord] = useState(false);

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

  const handleConnectDiscord = async () => {
    setIsConnectingDiscord(true);
    try {
      // Discord OAuth URL - redirect to Discord for authorization
      const discordClientId = '1285371693300551781'; // Your Discord app client ID
      const redirectUri = `${window.location.origin}/dashboard`;
      const scope = 'identify';
      
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
      
      // Open Discord OAuth in a popup
      const popup = window.open(discordAuthUrl, 'discord-auth', 'width=500,height=700,left=100,top=100');
      
      if (!popup) {
        toast({ 
          title: 'Please allow popups for this site', 
          variant: 'destructive' 
        });
        setIsConnectingDiscord(false);
        return;
      }

      // Listen for the popup to close or redirect
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsConnectingDiscord(false);
          fetchDiscordIntegration();
        }
      }, 500);
    } catch (error: any) {
      console.error('Discord connect error:', error);
      toast({ title: 'Failed to connect Discord', variant: 'destructive' });
      setIsConnectingDiscord(false);
    }
  };

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
            <p className="text-xs text-primary">Want more? Unlock with Premium</p>
          </div>

          {/* Alias Username */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Alias Username (Redirect)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-muted-foreground">@</span>
                <Input
                  value={aliasUsername}
                  onChange={(e) => setAliasUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                  placeholder="second-handle"
                  maxLength={20}
                />
              </div>
              {aliasUsername !== (profile?.alias_username || '') && onUpdateAlias && (
                <Button 
                  size="sm" 
                  onClick={async () => {
                    setIsSavingAlias(true);
                    try {
                      await onUpdateAlias(aliasUsername || null);
                    } finally {
                      setIsSavingAlias(false);
                    }
                  }}
                  disabled={isSavingAlias}
                >
                  {isSavingAlias ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
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
            <p className="text-xs text-muted-foreground">
              Visitors to /{aliasUsername || 'alias'} will be redirected to /{profile?.username}
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
              className="w-full"
              onClick={handleConnectDiscord}
              disabled={isConnectingDiscord}
            >
              {isConnectingDiscord ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FaDiscord className="w-4 h-4 mr-2 text-[#5865F2]" />
              )}
              Connect Discord
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
    </div>
  );
}
