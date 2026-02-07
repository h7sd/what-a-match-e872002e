import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Database, FileJson, FileCode, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportSummary {
  exported_at: string;
  tables_exported: number;
  total_rows: number;
  table_counts: Record<string, number>;
  errors?: string[];
}

export function AdminDatabaseExport() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [jsonData, setJsonData] = useState<Record<string, any[]> | null>(null);
  const [sqlBackup, setSqlBackup] = useState<string | null>(null);
  const [authUsers, setAuthUsers] = useState<any[] | null>(null);
  const { toast } = useToast();

  const runExport = async () => {
    setLoading(true);
    setSummary(null);
    setJsonData(null);
    setSqlBackup(null);
    setAuthUsers(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Nicht eingeloggt",
          description: "Bitte melde dich an.",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("export-database", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || "Export fehlgeschlagen");
      }

      setSummary(result.summary);
      setJsonData(result.json_data);
      setSqlBackup(result.sql_backup);
      setAuthUsers(Array.isArray(result.auth_users) ? result.auth_users : null);

      toast({
        title: "Export erfolgreich!",
        description: `${result.summary.total_rows} Datensätze aus ${result.summary.tables_exported} Tabellen exportiert.`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!jsonData) return;
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uservault-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSql = () => {
    if (!sqlBackup) return;
    const blob = new Blob([sqlBackup], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uservault-backup-${new Date().toISOString().split("T")[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAuthUsers = () => {
    if (!authUsers) return;
    const blob = new Blob([JSON.stringify(authUsers, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uservault-auth-users-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Database Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exportiere die gesamte Datenbank für die Migration zu einem selbst gehosteten Supabase-Projekt.
        </p>

        <Button
          onClick={runExport}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exportiere...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export starten
            </>
          )}
        </Button>

        {summary && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">Tabellen</p>
                <p className="text-lg font-bold text-primary">{summary.tables_exported}</p>
              </div>
              <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">Datensätze</p>
                <p className="text-lg font-bold text-green-500">{summary.total_rows.toLocaleString()}</p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={downloadJson}
                variant="outline"
                className="flex-1"
                disabled={!jsonData}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON Download
              </Button>
              <Button
                onClick={downloadSql}
                variant="outline"
                className="flex-1"
                disabled={!sqlBackup}
              >
                <FileCode className="w-4 h-4 mr-2" />
                SQL Download
              </Button>
              <Button
                onClick={downloadAuthUsers}
                variant="outline"
                className="flex-1"
                disabled={!authUsers}
              >
                <Users className="w-4 h-4 mr-2" />
                Auth-User
              </Button>
            </div>

            {/* Table Breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tabellen-Übersicht:</p>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {Object.entries(summary.table_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([table, count]) => (
                    <div
                      key={table}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded bg-card/30"
                    >
                      <span className="font-mono">{table}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Errors */}
            {summary.errors && summary.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-xs font-medium text-destructive mb-1">Fehler:</p>
                {summary.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80">{err}</p>
                ))}
              </div>
            )}

            {/* Migration Instructions */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-xs font-medium text-primary mb-2">Migration Steps:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Neues Supabase-Projekt erstellen</li>
                <li>Alle Migrations aus <code>supabase/migrations/</code> ausführen</li>
                <li>SQL-Backup importieren</li>
                <li>Storage-Buckets erstellen (avatars, backgrounds, etc.)</li>
                <li>Edge Functions deployen</li>
                <li><code>.env</code> mit neuen Credentials aktualisieren</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
