import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deriveApiEncryptionKey, encryptApiPayload, decryptApiPayload } from '@/lib/crypto';
import { useAuth } from '@/lib/auth';

interface SecureApiOptions {
  encrypted?: boolean;
}

export function useSecureApi() {
  const { user } = useAuth();
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);

  // Fetch and cache encryption key
  useEffect(() => {
    if (!user) {
      setEncryptionKey(null);
      return;
    }

    const fetchKey = async () => {
      setKeyLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-encryption-key');
        
        if (error) throw error;
        
        if (data?.keyMaterial) {
          const key = await deriveApiEncryptionKey(data.keyMaterial);
          setEncryptionKey(key);
        }
      } catch (err) {
        console.error('Failed to fetch encryption key:', err);
      } finally {
        setKeyLoading(false);
      }
    };

    fetchKey();
  }, [user]);

  // Make encrypted API call
  const secureCall = useCallback(async <T>(
    action: string, 
    data?: unknown,
    options: SecureApiOptions = { encrypted: true }
  ): Promise<T> => {
    if (!user) throw new Error('Not authenticated');
    
    setLoading(true);
    
    try {
      if (options.encrypted && encryptionKey) {
        // Encrypt the request
        const payload = { action, data };
        const encryptedPayload = await encryptApiPayload(payload, encryptionKey);
        
        const { data: response, error } = await supabase.functions.invoke('encrypted-api', {
          body: encryptedPayload,
          headers: { 'x-encrypted': 'true' }
        });

        if (error) throw error;

        // Decrypt the response
        if (response?.encrypted && response?.iv) {
          return await decryptApiPayload<T>(response.encrypted, response.iv, encryptionKey);
        }
        
        return response as T;
      } else {
        // Fallback to unencrypted call
        const { data: response, error } = await supabase.functions.invoke('encrypted-api', {
          body: { action, data }
        });

        if (error) throw error;
        return response as T;
      }
    } finally {
      setLoading(false);
    }
  }, [user, encryptionKey]);

  // Convenience methods for common operations
  const getProfile = useCallback(() => 
    secureCall<{ profile: unknown }>('get-profile'), [secureCall]);

  const updateProfile = useCallback((updates: Record<string, unknown>) => 
    secureCall<{ success: boolean }>('update-profile', updates), [secureCall]);

  const getSocialLinks = useCallback(() => 
    secureCall<{ links: unknown[] }>('get-social-links'), [secureCall]);

  const getBadges = useCallback(() => 
    secureCall<{ badges: unknown[] }>('get-badges'), [secureCall]);

  return {
    secureCall,
    getProfile,
    updateProfile,
    getSocialLinks,
    getBadges,
    loading,
    keyLoading,
    isReady: !!encryptionKey && !keyLoading,
  };
}
