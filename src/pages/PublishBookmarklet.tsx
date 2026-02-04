import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Copy, Check, Send, ArrowLeft, BookMarked, Rocket, 
  Plus, Trash2, Webhook, Radio, Users, Megaphone, FileText, AtSign, Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Import changelog files as raw text
import changelogContent from '/CHANGELOG.md?raw';
import publicChangelogContent from '/PUBLIC_CHANGELOG.md?raw';

interface SavedWebhook {
  id: string;
  name: string;
  webhook_url: string;
  description: string | null;
  notification_type: string;
  created_at: string;
}

interface DiscordRole {
  id: string;
  name: string;
  role_id: string;
  description: string | null;
  created_at: string;
}

export default function PublishBookmarklet() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin = false, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [version, setVersion] = useState('');
  const [changes, setChanges] = useState('');
  const [sending, setSending] = useState(false);
  
  // Notification type
  const [notificationType, setNotificationType] = useState<'changelog' | 'announce'>('changelog');
  
  // Webhook management
  const [webhooks, setWebhooks] = useState<SavedWebhook[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('default');
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  
  // Discord roles management
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  // Add webhook dialog
  const [addWebhookDialogOpen, setAddWebhookDialogOpen] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [newWebhookType, setNewWebhookType] = useState<'changelog' | 'announce'>('changelog');
  const [addingWebhook, setAddingWebhook] = useState(false);
  
  // Add role dialog
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  
  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);
  
  // Fetch webhooks
  useEffect(() => {
    const fetchWebhooks = async () => {
      if (!isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('admin_webhooks')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setWebhooks(data || []);
      } catch (err) {
        console.error('Error fetching webhooks:', err);
      } finally {
        setLoadingWebhooks(false);
      }
    };
    
    if (isAdmin) {
      fetchWebhooks();
    }
  }, [isAdmin]);
  
  // Fetch Discord roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('admin_discord_roles')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setDiscordRoles(data || []);
        // Select all by default
        setSelectedRoleIds((data || []).map(r => r.id));
      } catch (err) {
        console.error('Error fetching roles:', err);
      } finally {
        setLoadingRoles(false);
      }
    };
    
    if (isAdmin) {
      fetchRoles();
    }
  }, [isAdmin]);
  
  // Filter webhooks by type
  const filteredWebhooks = webhooks.filter(w => w.notification_type === notificationType);
  
  // Add new webhook
  const handleAddWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and URL are required.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!newWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      toast({
        title: 'Invalid Webhook URL',
        description: 'Please enter a valid Discord webhook URL.',
        variant: 'destructive',
      });
      return;
    }
    
    setAddingWebhook(true);
    try {
      const { data, error } = await supabase
        .from('admin_webhooks')
        .insert({
          name: newWebhookName.trim(),
          webhook_url: newWebhookUrl.trim(),
          description: newWebhookDescription.trim() || null,
          notification_type: newWebhookType,
          created_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setWebhooks(prev => [...prev, data]);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookDescription('');
      setAddWebhookDialogOpen(false);
      
      toast({
        title: 'Webhook added',
        description: `"${data.name}" has been saved.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not add webhook.',
        variant: 'destructive',
      });
    } finally {
      setAddingWebhook(false);
    }
  };
  
  // Delete webhook
  const handleDeleteWebhook = async (id: string, name: string) => {
    if (!confirm(`Delete webhook "${name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('admin_webhooks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setWebhooks(prev => prev.filter(w => w.id !== id));
      if (selectedWebhookId === id) {
        setSelectedWebhookId('default');
      }
      
      toast({ title: 'Deleted', description: `"${name}" has been removed.` });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not delete webhook.',
        variant: 'destructive',
      });
    }
  };
  
  // Add new role
  const handleAddRole = async () => {
    if (!newRoleName.trim() || !newRoleId.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and Role ID are required.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate role ID format (should be numeric)
    if (!/^\d+$/.test(newRoleId.trim())) {
      toast({
        title: 'Invalid Role ID',
        description: 'Role ID should be a numeric Discord ID.',
        variant: 'destructive',
      });
      return;
    }
    
    setAddingRole(true);
    try {
      const { data, error } = await supabase
        .from('admin_discord_roles')
        .insert({
          name: newRoleName.trim(),
          role_id: newRoleId.trim(),
          description: newRoleDescription.trim() || null,
          created_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setDiscordRoles(prev => [...prev, data]);
      setSelectedRoleIds(prev => [...prev, data.id]);
      setNewRoleName('');
      setNewRoleId('');
      setNewRoleDescription('');
      setAddRoleDialogOpen(false);
      
      toast({
        title: 'Role added',
        description: `"${data.name}" has been saved.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not add role.',
        variant: 'destructive',
      });
    } finally {
      setAddingRole(false);
    }
  };
  
  // Delete role
  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('admin_discord_roles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setDiscordRoles(prev => prev.filter(r => r.id !== id));
      setSelectedRoleIds(prev => prev.filter(rid => rid !== id));
      
      toast({ title: 'Deleted', description: `"${name}" has been removed.` });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not delete role.',
        variant: 'destructive',
      });
    }
  };
  
  // Toggle role selection
  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };
  
  // Generate bookmarklet code
  const bookmarkletCode = `javascript:(function(){
    var version=prompt('Version (z.B. 1.2.3):','');
    var changes=prompt('Änderungen (kommagetrennt):','');
    if(!version)return;
    fetch('https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/publish-notification',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+localStorage.getItem('sb-cjulgfbmcnmrkvnzkpym-auth-token')?.split('"access_token":"')[1]?.split('"')[0]
      },
      body:JSON.stringify({
        version:version,
        changes:changes?changes.split(',').map(function(s){return s.trim()}):[],
        publishedAt:new Date().toISOString()
      })
    }).then(function(r){return r.json()}).then(function(d){
      if(d.success)alert('✅ Discord-Benachrichtigung gesendet!');
      else alert('❌ Fehler: '+(d.error||'Unbekannt'));
    }).catch(function(e){alert('❌ Fehler: '+e.message)});
  })();`.replace(/\n/g, '').replace(/\s+/g, ' ');
  
  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Bookmarklet code copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const sendNotification = async () => {
    if (!version.trim()) {
      toast({
        title: 'Version required',
        description: 'Please enter a version number.',
        variant: 'destructive',
      });
      return;
    }
    
    setSending(true);
    try {
      // Get webhook URL if custom webhook selected
      let customWebhookUrl: string | undefined;
      if (selectedWebhookId !== 'default') {
        const webhook = webhooks.find(w => w.id === selectedWebhookId);
        customWebhookUrl = webhook?.webhook_url;
      }
      
      // Get selected role IDs
      const roleIdsToTag = discordRoles
        .filter(r => selectedRoleIds.includes(r.id))
        .map(r => r.role_id);
      
      const { data, error } = await supabase.functions.invoke('publish-notification', {
        body: {
          version: version.trim(),
          changes: changes.trim() ? changes.split('\n').filter(c => c.trim()) : [],
          publishedAt: new Date().toISOString(),
          customWebhookUrl,
          notificationType,
          roleIds: roleIdsToTag,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const webhookName = selectedWebhookId === 'default' 
          ? 'Default Webhook' 
          : webhooks.find(w => w.id === selectedWebhookId)?.name || 'Webhook';
        
        toast({
          title: '✅ Notification sent!',
          description: `${notificationType === 'changelog' ? 'Changelog' : 'Announcement'} sent via "${webhookName}".`,
        });
        setVersion('');
        setChanges('');
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      toast({
        title: 'Error',
        description: err.message || 'Could not send notification.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };
  
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard#admin')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
              <Rocket className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold">Discord Notifications</h1>
            <p className="text-gray-400">
              Send changelog updates to admins or announcements to all users.
            </p>
          </div>
          
          {/* Notification Type Tabs */}
          <Tabs value={notificationType} onValueChange={(v) => {
            setNotificationType(v as 'changelog' | 'announce');
            setSelectedWebhookId('default');
          }}>
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="changelog" className="data-[state=active]:bg-purple-600">
                <FileText className="w-4 h-4 mr-2" />
                Admin Changelog
              </TabsTrigger>
              <TabsTrigger value="announce" className="data-[state=active]:bg-emerald-600">
                <Megaphone className="w-4 h-4 mr-2" />
                Global Announce
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="changelog" className="space-y-6">
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  <strong>Admin Changelog:</strong> Internal updates for staff members. 
                  Use this for technical changes, bug fixes, and internal documentation.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="announce" className="space-y-6">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-300">
                  <strong>Global Announce:</strong> Public announcements for all users. 
                  Use this for new features, events, and important updates.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Webhook Management */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-blue-400" />
                  Webhooks
                </h2>
                
                <Dialog open={addWebhookDialogOpen} onOpenChange={setAddWebhookDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-white/20">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                      <DialogTitle>Add New Webhook</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newWebhookName}
                          onChange={(e) => setNewWebhookName(e.target.value)}
                          placeholder="e.g. Staff Updates"
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                      <div>
                        <Label>Discord Webhook URL</Label>
                        <Input
                          value={newWebhookUrl}
                          onChange={(e) => setNewWebhookUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={newWebhookType} onValueChange={(v) => setNewWebhookType(v as any)}>
                          <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="changelog">Admin Changelog</SelectItem>
                            <SelectItem value="announce">Global Announce</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description (optional)</Label>
                        <Input
                          value={newWebhookDescription}
                          onChange={(e) => setNewWebhookDescription(e.target.value)}
                          placeholder="What is this webhook for?"
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleAddWebhook}
                        disabled={addingWebhook}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {addingWebhook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Save Webhook
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {loadingWebhooks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Default Webhook */}
                  <div 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedWebhookId === 'default' 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => setSelectedWebhookId('default')}
                  >
                    <div className="flex items-center gap-3">
                      <Radio className={`w-4 h-4 ${selectedWebhookId === 'default' ? 'text-purple-400' : 'text-gray-500'}`} />
                      <div>
                        <p className="font-medium text-sm">Default Webhook</p>
                        <p className="text-xs text-gray-500">Environment variable</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom Webhooks filtered by type */}
                  {filteredWebhooks.map((webhook) => (
                    <div 
                      key={webhook.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedWebhookId === webhook.id 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedWebhookId(webhook.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Radio className={`w-4 h-4 ${selectedWebhookId === webhook.id ? 'text-purple-400' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-medium text-sm">{webhook.name}</p>
                          {webhook.description && (
                            <p className="text-xs text-gray-500">{webhook.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWebhook(webhook.id, webhook.name);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {filteredWebhooks.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No custom webhooks for this type.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Discord Roles Management */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AtSign className="w-5 h-5 text-amber-400" />
                  Tag Roles
                </h2>
                
                <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-white/20">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                      <DialogTitle>Add Discord Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Role Name</Label>
                        <Input
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="e.g. Staff"
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                      <div>
                        <Label>Discord Role ID</Label>
                        <Input
                          value={newRoleId}
                          onChange={(e) => setNewRoleId(e.target.value)}
                          placeholder="e.g. 1234567890123456789"
                          className="bg-white/5 border-white/10 mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enable Developer Mode in Discord, right-click a role → Copy Role ID
                        </p>
                      </div>
                      <div>
                        <Label>Description (optional)</Label>
                        <Input
                          value={newRoleDescription}
                          onChange={(e) => setNewRoleDescription(e.target.value)}
                          placeholder="What role is this?"
                          className="bg-white/5 border-white/10 mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleAddRole}
                        disabled={addingRole}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        {addingRole ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Save Role
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {loadingRoles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {discordRoles.map((role) => (
                    <div 
                      key={role.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => toggleRoleSelection(role.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{role.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{role.role_id}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {discordRoles.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No roles added yet. Add roles to tag them in notifications.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Send Form */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-400" />
              Send {notificationType === 'changelog' ? 'Changelog' : 'Announcement'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.6.0"
                  className="bg-white/5 border-white/10 mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="changes">
                    {notificationType === 'changelog' ? 'Changes (one per line)' : 'Announcement Message'}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const content = notificationType === 'changelog' ? changelogContent : publicChangelogContent;
                      setChanges(content);
                      // Try to extract version from the file
                      const versionMatch = content.match(/##\s*\[(\d+\.\d+\.\d+)\]/);
                      if (versionMatch) {
                        setVersion(versionMatch[1]);
                      }
                      toast({
                        title: 'Loaded!',
                        description: `Content from ${notificationType === 'changelog' ? 'CHANGELOG.md' : 'PUBLIC_CHANGELOG.md'} loaded.`,
                      });
                    }}
                    className="border-white/20 text-xs h-7"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {notificationType === 'changelog' ? 'CHANGELOG.md' : 'PUBLIC_CHANGELOG.md'}
                  </Button>
                </div>
                <Textarea
                  id="changes"
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder={notificationType === 'changelog' 
                    ? "Added new feature X\nFixed bug Y\nImproved performance"
                    : "🎉 Exciting new update!\n\nWe've added amazing new features..."}
                  className="bg-white/5 border-white/10 min-h-[120px]"
                />
              </div>
              
              {/* Summary */}
              <div className={`p-3 rounded-lg ${notificationType === 'changelog' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className={notificationType === 'changelog' ? 'text-purple-300' : 'text-emerald-300'}>
                    <strong>Webhook:</strong>{' '}
                    {selectedWebhookId === 'default' 
                      ? 'Default' 
                      : webhooks.find(w => w.id === selectedWebhookId)?.name || 'Unknown'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className={notificationType === 'changelog' ? 'text-purple-300' : 'text-emerald-300'}>
                    <strong>Tagging:</strong>{' '}
                    {selectedRoleIds.length === 0 
                      ? 'No roles' 
                      : `${selectedRoleIds.length} role${selectedRoleIds.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={sendNotification}
                disabled={sending}
                className={`w-full ${notificationType === 'changelog' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send {notificationType === 'changelog' ? 'Changelog' : 'Announcement'}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Bookmarklet Section */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-blue-400" />
              Bookmarklet (Quick Access)
            </h2>
            
            <p className="text-gray-400 text-sm">
              Drag to bookmarks bar. Uses default webhook only.
            </p>
            
            <div className="flex items-center gap-3">
              <a
                href={bookmarkletCode}
                onClick={(e) => e.preventDefault()}
                draggable
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-white hover:from-purple-700 hover:to-pink-700 transition-all cursor-move"
              >
                <Rocket className="w-4 h-4" />
                🚀 UV Publish
              </a>
              <Button
                variant="outline"
                onClick={copyBookmarklet}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}