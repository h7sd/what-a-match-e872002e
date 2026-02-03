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
import { Loader2, Copy, Check, Send, ArrowLeft, BookMarked, Rocket } from 'lucide-react';

export default function PublishBookmarklet() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin = false, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [version, setVersion] = useState('');
  const [changes, setChanges] = useState('');
  const [sending, setSending] = useState(false);
  
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
      title: 'Kopiert!',
      description: 'Bookmarklet-Code in die Zwischenablage kopiert.',
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const sendNotification = async () => {
    if (!version.trim()) {
      toast({
        title: 'Version erforderlich',
        description: 'Bitte gib eine Version ein.',
        variant: 'destructive',
      });
      return;
    }
    
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-notification', {
        body: {
          version: version.trim(),
          changes: changes.trim() ? changes.split('\n').filter(c => c.trim()) : [],
          publishedAt: new Date().toISOString(),
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: '✅ Benachrichtigung gesendet!',
          description: 'Die Discord-Nachricht wurde erfolgreich gesendet.',
        });
        setVersion('');
        setChanges('');
      } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      toast({
        title: 'Fehler',
        description: err.message || 'Konnte Benachrichtigung nicht senden.',
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
          Zurück zum Dashboard
        </Button>
        
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
              <Rocket className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold">Publish-Benachrichtigung</h1>
            <p className="text-gray-400">
              Sende eine Discord-Benachrichtigung wenn du die Website published hast.
            </p>
          </div>
          
          {/* Manual Send Form */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-400" />
              Jetzt senden
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="z.B. 1.2.3"
                  className="bg-white/5 border-white/10 mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="changes">Änderungen (eine pro Zeile)</Label>
                <Textarea
                  id="changes"
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Neue Feature X hinzugefügt&#10;Bug Y behoben&#10;Performance verbessert"
                  className="bg-white/5 border-white/10 mt-1 min-h-[120px]"
                />
              </div>
              
              <Button
                onClick={sendNotification}
                disabled={sending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Discord-Benachrichtigung senden
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
              Ziehe diesen Button in deine Lesezeichen-Leiste. Nach dem Publish auf Lovable klickst du einfach das Lesezeichen.
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
                <span className="text-gray-500 text-sm">← Ziehe mich in deine Lesezeichen</span>
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
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Code kopieren
                  </>
                )}
              </Button>
            </div>
            
            {/* Instructions */}
            <div className="mt-4 p-4 bg-black/30 rounded-lg">
              <h3 className="font-medium text-sm text-gray-300 mb-2">Anleitung:</h3>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Ziehe den Button "🚀 UV Publish" in deine Lesezeichen-Leiste</li>
                <li>Publish deine Website auf Lovable</li>
                <li>Klicke auf das Lesezeichen</li>
                <li>Gib die Version und Änderungen ein</li>
                <li>Die Discord-Benachrichtigung wird automatisch gesendet!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
