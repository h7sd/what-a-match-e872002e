 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
 
 export function AdminBotNotificationTester() {
   const [commandName, setCommandName] = useState("test-command");
   const [action, setAction] = useState<"created" | "updated" | "deleted">("updated");
   const [loading, setLoading] = useState(false);
   const [lastResult, setLastResult] = useState<{ success: boolean; id?: string; error?: string } | null>(null);
 
   const sendTestNotification = async () => {
     setLoading(true);
     setLastResult(null);
 
     try {
       const { data, error } = await supabase
         .from("bot_command_notifications")
         .insert({
           command_name: commandName,
           action: action,
           changes: {
             test: true,
             timestamp: new Date().toISOString(),
             note: "Test notification from Admin Panel"
           },
           processed: false
         })
         .select()
         .single();
 
       if (error) throw error;
 
       setLastResult({ success: true, id: data.id });
       toast.success("Test-Notification gesendet!", {
         description: `ID: ${data.id.slice(0, 8)}...`
       });
     } catch (err: any) {
       setLastResult({ success: false, error: err.message });
       toast.error("Fehler beim Senden", { description: err.message });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Card className="bg-card/50 border-border">
       <CardHeader className="pb-3">
         <CardTitle className="text-lg flex items-center gap-2">
           <Send className="h-5 w-5 text-primary" />
           Bot Notification Tester
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="grid grid-cols-2 gap-3">
           <div className="space-y-1.5">
             <label className="text-sm text-muted-foreground">Command Name</label>
             <Input
               value={commandName}
               onChange={(e) => setCommandName(e.target.value)}
               placeholder="test-command"
             />
           </div>
           <div className="space-y-1.5">
             <label className="text-sm text-muted-foreground">Action</label>
             <Select value={action} onValueChange={(v) => setAction(v as any)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="created">🆕 Created (Grün)</SelectItem>
                 <SelectItem value="updated">✏️ Updated (Blau)</SelectItem>
                 <SelectItem value="deleted">🗑️ Deleted (Rot)</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
 
         <Button onClick={sendTestNotification} disabled={loading} className="w-full">
           {loading ? (
             <>
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               Sende...
             </>
           ) : (
             <>
               <Send className="h-4 w-4 mr-2" />
               Test-Notification senden
             </>
           )}
         </Button>
 
         {lastResult && (
           <div className={`p-3 rounded-lg text-sm ${lastResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
             {lastResult.success ? (
               <div className="flex items-center gap-2">
                 <CheckCircle className="h-4 w-4" />
                 <span>Notification erstellt: <code className="bg-black/30 px-1 rounded">{lastResult.id?.slice(0, 8)}...</code></span>
               </div>
             ) : (
               <div className="flex items-center gap-2">
                 <XCircle className="h-4 w-4" />
                 <span>{lastResult.error}</span>
               </div>
             )}
           </div>
         )}
 
         <p className="text-xs text-muted-foreground">
           Wenn der Bot läuft und pollt, sollte die Nachricht innerhalb von ~5 Sekunden im Discord-Channel erscheinen.
         </p>
       </CardContent>
     </Card>
   );
 }