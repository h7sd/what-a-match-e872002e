import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-proxy-client';
import { deriveEncryptionKey, encryptFile, decryptToObjectUrl } from '@/lib/crypto';

interface EncryptionState {
  key: CryptoKey | null;
  isLoading: boolean;
  error: string | null;
}

// Cache for decrypted URLs to avoid re-decrypting
const decryptedUrlCache = new Map<string, string>();

export function useEncryption() {
  const [state, setState] = useState<EncryptionState>({
    key: null,
    isLoading: true,
    error: null,
  });
  
  const keyRef = useRef<CryptoKey | null>(null);
  const keyMaterialRef = useRef<string | null>(null);

  // Fetch encryption key from server
  const fetchEncryptionKey = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState({ key: null, isLoading: false, error: null });
        return;
      }

      // Check if we already have the key material cached
      const cachedKeyMaterial = sessionStorage.getItem('enc_key_material');
      const cachedExpiry = sessionStorage.getItem('enc_key_expiry');
      
      if (cachedKeyMaterial && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
        const key = await deriveEncryptionKey(cachedKeyMaterial);
        keyRef.current = key;
        keyMaterialRef.current = cachedKeyMaterial;
        setState({ key, isLoading: false, error: null });
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-encryption-key');
      
      if (error) throw error;
      if (!data?.keyMaterial) throw new Error('No key material received');

      // Derive the actual encryption key
      const key = await deriveEncryptionKey(data.keyMaterial);
      
      // Cache key material in session storage (not the actual key)
      sessionStorage.setItem('enc_key_material', data.keyMaterial);
      sessionStorage.setItem('enc_key_expiry', data.expiresAt.toString());
      
      keyRef.current = key;
      keyMaterialRef.current = data.keyMaterial;
      setState({ key, isLoading: false, error: null });
    } catch (error: any) {
      console.error('Failed to fetch encryption key:', error);
      setState({ key: null, isLoading: false, error: error.message });
    }
  }, []);

  useEffect(() => {
    fetchEncryptionKey();
    
    // Refresh key on auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchEncryptionKey();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEncryptionKey]);

  // Encrypt a file before upload
  const encrypt = useCallback(async (file: File): Promise<Blob | null> => {
    if (!keyRef.current) {
      console.error('No encryption key available');
      return null;
    }
    
    try {
      const { encryptedBlob } = await encryptFile(file, keyRef.current);
      return encryptedBlob;
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }, []);

  // Decrypt a file URL for display
  const decryptUrl = useCallback(async (encryptedUrl: string, mimeType: string): Promise<string | null> => {
    // Check cache first
    if (decryptedUrlCache.has(encryptedUrl)) {
      return decryptedUrlCache.get(encryptedUrl)!;
    }
    
    if (!keyRef.current) {
      console.error('No encryption key available');
      return null;
    }
    
    try {
      const objectUrl = await decryptToObjectUrl(encryptedUrl, keyRef.current, mimeType);
      decryptedUrlCache.set(encryptedUrl, objectUrl);
      return objectUrl;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }, []);

  // Clear decrypted URL cache (call when navigating away)
  const clearCache = useCallback(() => {
    decryptedUrlCache.forEach(url => URL.revokeObjectURL(url));
    decryptedUrlCache.clear();
  }, []);

  return {
    key: state.key,
    isLoading: state.isLoading,
    error: state.error,
    encrypt,
    decryptUrl,
    clearCache,
    isReady: !!state.key && !state.isLoading,
  };
}
