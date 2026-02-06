import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Database, Shield, Lock, AlertTriangle, Search, RefreshCw, Download, FileArchive } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Allowed UID numbers
const ALLOWED_UIDS = [1, 999, 2];

// Table names to fetch (public schema)
const TABLE_NAMES = [
  'profiles',
  'badges',
  'global_badges',
  'user_badges',
  'social_links',
  'profile_views',
  'link_clicks',
  'purchases',
  'promo_codes',
  'promo_code_uses',
  'user_roles',
  'banned_users',
  'badge_requests',
  'alias_requests',
  'verification_codes',
  'support_tickets',
  'support_messages',
  'live_chat_conversations',
  'live_chat_messages',
  'discord_integrations',
  'discord_presence',
  'spotify_integrations',
] as const;

type TableName = typeof TABLE_NAMES[number];

interface TableData {
  [key: string]: unknown[];
}

export default function SecretDatabaseViewer() {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [authStep, setAuthStep] = useState<'loading' | 'mfa_required' | 'mfa_verify' | 'access_denied' | 'authorized'>('loading');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userUid, setUserUid] = useState<number | null>(null);
  // Per-visit MFA gate: user must enter a 6-digit code every time they open this page.
  const [mfaGatePassed, setMfaGatePassed] = useState(false);
  
  const [tableData, setTableData] = useState<TableData>({});
  const [activeTable, setActiveTable] = useState<TableName>('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Download functionality with separate 2FA
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadMfaCode, setDownloadMfaCode] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<'sql' | 'all' | 'schema'>('sql');
  const [error, setError] = useState<string | null>(null);

  // Check authentication and authorization
  useEffect(() => {
    const checkAccess = async () => {
      // Important: when navigating here, AuthProvider may need a moment to hydrate session.
      if (authLoading) {
        setAuthStep('loading');
        return;
      }

      if (!user || !session) {
        // Don't bounce to /auth (Auth page redirects to /dashboard when already logged in).
        // Show a clear denied state instead.
        setAuthStep('access_denied');
        return;
      }

      // Enforce MFA setup (TOTP) + require code entry on every visit.
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        console.error('MFA factors error:', factorsError);
        setAuthStep('access_denied');
        return;
      }

      const verifiedFactor = factorsData?.totp?.find((f) => f.status === 'verified');
      if (!verifiedFactor) {
        setAuthStep('mfa_required');
        return;
      }

      setMfaFactorId(verifiedFactor.id);

      // Always ask for a code when opening this viewer.
      if (!mfaGatePassed) {
        setAuthStep('mfa_verify');
        return;
      }

      await checkUidAccess();
    };

    checkAccess();
  }, [user, session, authLoading, mfaGatePassed, navigate]);

  const checkUidAccess = async () => {
    if (!user) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('uid_number')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      setAuthStep('access_denied');
      return;
    }

    setUserUid(profile.uid_number);

    if (ALLOWED_UIDS.includes(profile.uid_number)) {
      setAuthStep('authorized');
      loadAllTables();
    } else {
      setAuthStep('access_denied');
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode
      });

      if (verifyError) throw verifyError;

      // Refresh session after MFA
      await supabase.auth.getSession();

      setMfaGatePassed(true);
      setAuthStep('loading');
      
      // Now check UID access
      await checkUidAccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      toast({
        title: 'MFA Verification Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      setMfaCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const loadAllTables = async () => {
    setIsLoading(true);
    setError(null);

    const newData: TableData = {};

    for (const tableName of TABLE_NAMES) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1000);

        if (error) {
          console.error(`Error loading ${tableName}:`, error);
          newData[tableName] = [];
        } else {
          newData[tableName] = data || [];
        }
      } catch (err) {
        console.error(`Exception loading ${tableName}:`, err);
        newData[tableName] = [];
      }
    }

    setTableData(newData);
    setIsLoading(false);
  };

  const refreshTable = async (tableName: TableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1000);

      if (error) throw error;

      setTableData(prev => ({
        ...prev,
        [tableName]: data || []
      }));

      toast({
        title: 'Table Refreshed',
        description: `${tableName} data has been updated.`
      });
    } catch (err) {
      toast({
        title: 'Refresh Failed',
        description: `Could not refresh ${tableName}`,
        variant: 'destructive'
      });
    }
  };

  const getFilteredData = (data: unknown[]) => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(row => {
      if (typeof row !== 'object' || row === null) return false;
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      );
    });
  };

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Generate SQL INSERT statements for all data
  const generateSqlExport = (): string => {
    const lines: string[] = [
      '-- Database Data Export (INSERT STATEMENTS)',
      `-- Generated: ${new Date().toISOString()}`,
      '-- Format: PostgreSQL INSERT statements',
      '-- IMPORTANT: Run the SCHEMA export FIRST before this file!',
      '',
    ];

    for (const tableName of TABLE_NAMES) {
      const data = tableData[tableName] || [];
      if (data.length === 0) continue;

      lines.push(`-- Table: ${tableName}`);
      lines.push(`-- Rows: ${data.length}`);
      lines.push('');

      for (const row of data) {
        if (typeof row !== 'object' || row === null) continue;
        const rowObj = row as Record<string, unknown>;
        const columns = Object.keys(rowObj);
        const values = columns.map(col => {
          const val = rowObj[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        lines.push(`INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  // Generate Schema SQL export (CREATE TABLE statements)
  const generateSchemaExport = (): string => {
    const lines: string[] = [
      '-- ============================================',
      '-- USERVAULT DATABASE SCHEMA EXPORT',
      `-- Generated: ${new Date().toISOString()}`,
      '-- ============================================',
      '-- ',
      '-- IMPORTANT: Run this FIRST before importing data!',
      '-- This creates all tables, types, functions, and triggers.',
      '-- ============================================',
      '',
      '-- Create custom types',
      'DO $$ BEGIN',
      "  CREATE TYPE public.app_role AS ENUM ('admin', 'supporter', 'user');",
      'EXCEPTION WHEN duplicate_object THEN NULL;',
      'END $$;',
      '',
    ];

    // Generate CREATE TABLE statements based on existing data structure
    for (const tableName of TABLE_NAMES) {
      const data = tableData[tableName] || [];
      if (data.length === 0) {
        lines.push(`-- TABLE: ${tableName} (no data to infer schema)`);
        lines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (id uuid DEFAULT gen_random_uuid() PRIMARY KEY);`);
        lines.push('');
        continue;
      }

      const firstRow = data[0] as Record<string, unknown>;
      lines.push(`-- TABLE: ${tableName} (inferred from ${data.length} rows)`);
      lines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
      
      const colDefs = Object.entries(firstRow).map(([col, val]) => {
        let type = 'text';
        if (val === null) type = 'text';
        else if (typeof val === 'boolean') type = 'boolean DEFAULT false';
        else if (typeof val === 'number') type = Number.isInteger(val) ? 'integer' : 'numeric';
        else if (typeof val === 'object') type = 'jsonb';
        else if (col === 'id') return `  ${col} uuid DEFAULT gen_random_uuid() PRIMARY KEY`;
        else if (col.endsWith('_id') && col !== 'id') type = 'uuid';
        else if (col.endsWith('_at') || col === 'created_at' || col === 'updated_at') type = 'timestamp with time zone DEFAULT now()';
        else if (col === 'email') type = 'text';
        
        if (col === 'id') return `  ${col} uuid DEFAULT gen_random_uuid() PRIMARY KEY`;
        return `  ${col} ${type}`;
      });
      
      lines.push(colDefs.join(',\n'));
      lines.push(');');
      lines.push('');
    }

    // Add RLS enable statements
    lines.push('-- Enable Row Level Security on all tables');
    for (const tableName of TABLE_NAMES) {
      lines.push(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`);
    }
    lines.push('');

    // Add essential functions
    lines.push('-- Essential security functions');
    lines.push('CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)');
    lines.push('RETURNS boolean');
    lines.push('LANGUAGE sql');
    lines.push('STABLE');
    lines.push('SECURITY DEFINER');
    lines.push('SET search_path = public');
    lines.push('AS $$');
    lines.push('  SELECT EXISTS (');
    lines.push('    SELECT 1');
    lines.push('    FROM public.user_roles');
    lines.push('    WHERE user_id = _user_id');
    lines.push('      AND role = _role');
    lines.push('  )');
    lines.push('$$;');
    lines.push('');

    lines.push('CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_id uuid)');
    lines.push('RETURNS boolean');
    lines.push('LANGUAGE sql');
    lines.push('STABLE');
    lines.push('SECURITY DEFINER');
    lines.push('SET search_path = public');
    lines.push('AS $$');
    lines.push('  SELECT EXISTS (');
    lines.push('    SELECT 1');
    lines.push('    FROM public.profiles p');
    lines.push('    WHERE p.id = profile_id');
    lines.push('      AND p.user_id = auth.uid()');
    lines.push('  )');
    lines.push('$$;');
    lines.push('');

    // Storage buckets
    lines.push('-- Storage buckets');
    lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;");
    lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT DO NOTHING;");
    lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('badge-icons', 'badge-icons', true) ON CONFLICT DO NOTHING;");
    lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT DO NOTHING;");
    lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true) ON CONFLICT DO NOTHING;");

    return lines.join('\n');
  };

  // Generate JSON export for all tables
  const generateJsonExport = (): string => {
    const exportData: Record<string, unknown[]> = {};
    for (const tableName of TABLE_NAMES) {
      exportData[tableName] = tableData[tableName] || [];
    }
    return JSON.stringify(exportData, null, 2);
  };

  // Create a simple text-based bundle (no external zip library needed)
  const downloadAllFormats = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Download SQL
    const sqlContent = generateSqlExport();
    const sqlBlob = new Blob([sqlContent], { type: 'application/sql' });
    const sqlUrl = URL.createObjectURL(sqlBlob);
    const sqlLink = document.createElement('a');
    sqlLink.href = sqlUrl;
    sqlLink.download = `database-export-${timestamp}.sql`;
    document.body.appendChild(sqlLink);
    sqlLink.click();
    document.body.removeChild(sqlLink);
    URL.revokeObjectURL(sqlUrl);

    // Download JSON
    const jsonContent = generateJsonExport();
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `database-export-${timestamp}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
  };

  // Verify 2FA and trigger download
  const handleDownloadWithMfa = async () => {
    if (!mfaFactorId || downloadMfaCode.length !== 6) return;

    setIsDownloading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: downloadMfaCode
      });

      if (verifyError) throw verifyError;

      if (downloadType === 'all') {
        // Download Schema, SQL data, and JSON
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Download Schema first
        const schemaContent = generateSchemaExport();
        const schemaBlob = new Blob([schemaContent], { type: 'application/sql' });
        const schemaUrl = URL.createObjectURL(schemaBlob);
        const schemaLink = document.createElement('a');
        schemaLink.href = schemaUrl;
        schemaLink.download = `schema-export-${timestamp}.sql`;
        document.body.appendChild(schemaLink);
        schemaLink.click();
        document.body.removeChild(schemaLink);
        URL.revokeObjectURL(schemaUrl);

        // Then download data
        downloadAllFormats();
        toast({
          title: 'Downloads gestartet',
          description: 'Schema, SQL-Daten und JSON Dateien werden heruntergeladen.'
        });
      } else if (downloadType === 'schema') {
        // Generate and download Schema only
        const schemaContent = generateSchemaExport();
        const blob = new Blob([schemaContent], { type: 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schema-export-${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Schema Download gestartet',
          description: 'Die Schema-SQL-Datei wird heruntergeladen. ZUERST ausführen!'
        });
      } else {
        // Generate and download SQL data only
        const sqlContent = generateSqlExport();
        const blob = new Blob([sqlContent], { type: 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Daten Download gestartet',
          description: 'Die Daten-SQL-Datei wird heruntergeladen.'
        });
      }

      setShowDownloadModal(false);
      setDownloadMfaCode('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verifizierung fehlgeschlagen';
      toast({
        title: '2FA-Verifizierung fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive'
      });
      setDownloadMfaCode('');
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (authStep === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white/60">Verifying access...</p>
        </div>
      </div>
    );
  }

  // MFA required (not set up)
  if (authStep === 'mfa_required') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <Shield className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-white text-2xl">MFA Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/60 mb-6">
              You must have Two-Factor Authentication enabled to access this area.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard & Enable MFA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // MFA verification
  if (authStep === 'mfa_verify') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <Lock className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <CardTitle className="text-white text-2xl">Verify Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-white/60 text-center">
              Enter your 6-digit authentication code to access the database viewer.
            </p>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={setMfaCode}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={1} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={2} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={3} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={4} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={5} className="bg-zinc-800 border-zinc-700 text-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleMfaVerify}
              className="w-full"
              disabled={mfaCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Access'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied
  if (authStep === 'access_denied') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/60 mb-2">
              You do not have permission to access this area.
            </p>
            {userUid !== null && (
              <p className="text-white/40 text-sm mb-6">
                Your UID: {userUid}
              </p>
            )}
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authorized - show database viewer
  const currentTableData = tableData[activeTable] || [];
  const filteredData = getFilteredData(currentTableData);
  const columns = currentTableData.length > 0 && typeof currentTableData[0] === 'object' && currentTableData[0] !== null
    ? Object.keys(currentTableData[0] as object) 
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-500" />
              <div>
                <h1 className="text-xl font-bold">Database Viewer</h1>
                <p className="text-xs text-white/40">Read-Only Access • UID {userUid}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                <Shield className="h-3 w-3" />
                AAL2 Verified
              </div>
              <Button
                variant="default"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  setDownloadType('schema');
                  setShowDownloadModal(true);
                }}
                disabled={isLoading || Object.keys(tableData).length === 0}
              >
                <FileArchive className="h-4 w-4 mr-1" />
                1. Schema
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDownloadType('sql');
                  setShowDownloadModal(true);
                }}
                disabled={isLoading || Object.keys(tableData).length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                2. Daten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDownloadType('all');
                  setShowDownloadModal(true);
                }}
                disabled={isLoading || Object.keys(tableData).length === 0}
              >
                <FileArchive className="h-4 w-4 mr-1" />
                Alles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAllTables}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Table List */}
          <div className="col-span-3">
            <Card className="bg-zinc-900 border-zinc-800 sticky top-24">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">Tables</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="space-y-1">
                    {TABLE_NAMES.map(tableName => (
                      <button
                        key={tableName}
                        onClick={() => setActiveTable(tableName)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          activeTable === tableName
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'hover:bg-zinc-800 text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{tableName}</span>
                          <span className="text-xs text-white/40">
                            {tableData[tableName]?.length || 0}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Table Data */}
          <div className="col-span-9">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="py-3 px-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-medium">{activeTable}</CardTitle>
                    <span className="text-xs text-white/40 bg-zinc-800 px-2 py-1 rounded">
                      {filteredData.length} / {currentTableData.length} rows
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64 bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshTable(activeTable)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    {currentTableData.length === 0 ? 'No data in this table' : 'No results found'}
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-zinc-800 hover:bg-transparent">
                            {columns.map(col => (
                              <TableHead 
                                key={col} 
                                className="text-white/60 font-medium whitespace-nowrap text-xs"
                              >
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((row, idx) => (
                            <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                              {columns.map(col => (
                                <TableCell 
                                  key={col} 
                                  className="text-white/80 text-xs py-2 max-w-xs truncate"
                                  title={renderValue((row as Record<string, unknown>)[col])}
                                >
                                  {renderValue((row as Record<string, unknown>)[col])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Download Modal with 2FA */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-500" />
              {downloadType === 'all' ? 'Kompletter Export' : downloadType === 'schema' ? 'Schema Export' : 'Daten Export'} bestätigen
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {downloadType === 'all' 
                ? 'Gib deinen 6-stelligen 2FA-Code ein, um Schema + SQL + JSON Dateien herunterzuladen.'
                : downloadType === 'schema'
                ? 'Gib deinen 2FA-Code ein, um das Schema (CREATE TABLE) herunterzuladen. ZUERST ausführen!'
                : 'Gib deinen 2FA-Code ein, um die Daten (INSERT) herunterzuladen. NACH dem Schema ausführen!'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={downloadMfaCode}
                onChange={setDownloadMfaCode}
                disabled={isDownloading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={1} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={2} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={3} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={4} className="bg-zinc-800 border-zinc-700 text-white" />
                  <InputOTPSlot index={5} className="bg-zinc-800 border-zinc-700 text-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="text-xs text-zinc-500 text-center">
              {downloadType === 'all' 
                ? `Export enthält alle ${TABLE_NAMES.length} Tabellen als Schema + SQL + JSON Dateien.`
                : downloadType === 'schema'
                ? `Erstellt CREATE TABLE Statements für alle ${TABLE_NAMES.length} Tabellen + RLS + Storage Buckets.`
                : `Die exportierte Datei enthält alle ${TABLE_NAMES.length} Tabellen als PostgreSQL INSERT-Statements.`
              }
            </div>

            <Button 
              onClick={handleDownloadWithMfa}
              className="w-full"
              disabled={downloadMfaCode.length !== 6 || isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportiere...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download starten
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
