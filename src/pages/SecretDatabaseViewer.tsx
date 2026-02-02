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
import { Loader2, Database, Shield, Lock, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';

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
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  const [authStep, setAuthStep] = useState<'loading' | 'mfa_required' | 'mfa_verify' | 'access_denied' | 'authorized'>('loading');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userUid, setUserUid] = useState<number | null>(null);
  
  const [tableData, setTableData] = useState<TableData>({});
  const [activeTable, setActiveTable] = useState<TableName>('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check authentication and authorization
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !session) {
        navigate('/auth');
        return;
      }

      // Check MFA status
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) {
        console.error('MFA check error:', aalError);
        setAuthStep('access_denied');
        return;
      }

      // User needs MFA but doesn't have it set up
      if (aalData.nextLevel === 'aal1' && aalData.currentLevel === 'aal1') {
        // Check if user has any TOTP factors
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        if (!factorsData?.totp || factorsData.totp.length === 0) {
          setAuthStep('mfa_required');
          return;
        }
      }

      // User has MFA but is at AAL1 - needs to verify
      if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factorsData?.totp?.find(f => f.status === 'verified');
        if (verifiedFactor) {
          setMfaFactorId(verifiedFactor.id);
          setAuthStep('mfa_verify');
          return;
        } else {
          setAuthStep('mfa_required');
          return;
        }
      }

      // User is at AAL2 - check UID
      if (aalData.currentLevel === 'aal2') {
        await checkUidAccess();
      } else {
        setAuthStep('access_denied');
      }
    };

    checkAccess();
  }, [user, session, navigate]);

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
    </div>
  );
}
