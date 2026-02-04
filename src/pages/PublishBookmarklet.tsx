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
import { 
  Loader2, Copy, Check, Send, ArrowLeft, BookMarked, Rocket, 
  Plus, Trash2, Webhook, Radio 
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

interface SavedWebhook {
  id: string;
  name: string;
  webhook_url: string;
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
  
  // Webhook management
  const [webhooks, setWebhooks] = useState<SavedWebhook[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('default');
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  
  // Add webhook dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [addingWebhook, setAddingWebhook] = useState(false);
  
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
    
    // Validate URL format
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
          created_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setWebhooks(prev => [...prev, data]);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookDescription('');
      setAddDialogOpen(false);
      
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
      
      toast({
        title: 'Deleted',
        description: `"${name}" has been removed.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not delete webhook.',
        variant: 'destructive',
      });
    }
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
    toast({
      title: 'Copied!',
      description: 'Bookmarklet code copied to clipboard.',
    });
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
      
      const { data, error } = await supabase.functions.invoke('publish-notification', {
        body: {
          version: version.trim(),
          changes: changes.trim() ? changes.split('\n').filter(c => c.trim()) : [],
          publishedAt: new Date().toISOString(),
          customWebhookUrl,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const webhookName = selectedWebhookId === 'default' 
          ? 'Default Webhook' 
          : webhooks.find(w => w.id === selectedWebhookId)?.name || 'Webhook';
        
        toast({
          title: '✅ Notification sent!',
          description: `Discord message sent via "${webhookName}".`,
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
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
            <h1 className="text-3xl font-bold">Publish Notification</h1>
            <p className="text-gray-400">
              Send a Discord notification when you publish the website.
            </p>
          </div>
          
          {/* Webhook Management */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Webhook className="w-5 h-5 text-blue-400" />
                Webhooks
              </h2>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-white/20">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-white/10">
                  <DialogHeader>
                    <DialogTitle>Add New Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="webhook-name">Name</Label>
                      <Input
                        id="webhook-name"
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        placeholder="e.g. Staff Updates"
                        className="bg-white/5 border-white/10 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">Discord Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="bg-white/5 border-white/10 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-desc">Description (optional)</Label>
                      <Input
                        id="webhook-desc"
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
                      {addingWebhook ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Save Webhook
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Webhook List */}
            {loadingWebhooks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
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
                      <p className="font-medium">Default Webhook</p>
                      <p className="text-xs text-gray-500">Configured in environment variables</p>
                    </div>
                  </div>
                </div>
                
                {/* Custom Webhooks */}
                {webhooks.map((webhook) => (
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
                        <p className="font-medium">{webhook.name}</p>
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
                
                {webhooks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No custom webhooks added yet.
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Manual Send Form */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-400" />
              Send Notification
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.2.3"
                  className="bg-white/5 border-white/10 mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="changes">Changes (one per line)</Label>
                <Textarea
                  id="changes"
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Added new feature X&#10;Fixed bug Y&#10;Improved performance"
                  className="bg-white/5 border-white/10 mt-1 min-h-[120px]"
                />
              </div>
              
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  <strong>Selected:</strong>{' '}
                  {selectedWebhookId === 'default' 
                    ? 'Default Webhook' 
                    : webhooks.find(w => w.id === selectedWebhookId)?.name || 'Unknown'}
                </p>
              </div>
              
              <Button
                onClick={sendNotification}
                disabled={sending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Discord Notification
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Bookmarklet Section */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-blue-400" />
              Bookmarklet (Alternative)
            </h2>
            
            <p className="text-gray-400 text-sm">
              Drag this button to your bookmarks bar. After publishing on Lovable, just click the bookmark.
              <br />
              <span className="text-yellow-500/80">Note: Bookmarklet only uses the default webhook.</span>
            </p>
            
            <div className="flex flex-col gap-3">
              {/* Draggable Bookmarklet Button */}
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
                <span className="text-gray-500 text-sm">← Drag to your bookmarks</span>
              </div>
              
              {/* Copy Button */}
              <Button
                variant="outline"
                onClick={copyBookmarklet}
                className="w-fit border-white/20 text-white hover:bg-white/10"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            
            {/* Instructions */}
            <div className="mt-4 p-4 bg-black/30 rounded-lg">
              <h3 className="font-medium text-sm text-gray-300 mb-2">Instructions:</h3>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Drag the "🚀 UV Publish" button to your bookmarks bar</li>
                <li>Publish your website on Lovable</li>
                <li>Click on the bookmark</li>
                <li>Enter the version and changes</li>
                <li>The Discord notification will be sent automatically!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}