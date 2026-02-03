import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

// Cache signed URLs to avoid redundant requests
const urlCache = new Map<string, SignedUrlCache>();

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of urlCache.entries()) {
    if (value.expiresAt < now) {
      urlCache.delete(key);
    }
  }
}, 60000); // Every minute

export function useSignedUrl() {
  const [loading, setLoading] = useState(false);
  const pendingRequests = useRef<Map<string, Promise<string>>>(new Map());

  // Get a single signed URL
  const getSignedUrl = useCallback(async (
    bucket: string,
    path: string,
    options: { sensitive?: boolean } = {}
  ): Promise<string> => {
    const cacheKey = `${bucket}:${path}`;
    
    // Check cache first
    const cached = urlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) { // 1 min buffer
      return cached.url;
    }

    // Check if there's already a pending request for this URL
    const pending = pendingRequests.current.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Make new request
    const requestPromise = (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('signed-url', {
          body: { 
            action: 'sign', 
            bucket, 
            path,
            sensitive: options.sensitive 
          }
        });

        if (error) throw error;

        if (data?.signedUrl) {
          urlCache.set(cacheKey, {
            url: data.signedUrl,
            expiresAt: data.expiresAt,
          });
          return data.signedUrl;
        }

        throw new Error('Failed to get signed URL');
      } finally {
        setLoading(false);
        pendingRequests.current.delete(cacheKey);
      }
    })();

    pendingRequests.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  // Get multiple signed URLs in batch
  const getSignedUrls = useCallback(async (
    bucket: string,
    paths: string[],
    options: { sensitive?: boolean } = {}
  ): Promise<Record<string, string>> => {
    // Filter out paths that are already cached
    const uncachedPaths: string[] = [];
    const results: Record<string, string> = {};

    for (const path of paths) {
      const cacheKey = `${bucket}:${path}`;
      const cached = urlCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now() + 60000) {
        results[path] = cached.url;
      } else {
        uncachedPaths.push(path);
      }
    }

    if (uncachedPaths.length === 0) {
      return results;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('signed-url', {
        body: { 
          action: 'sign-batch', 
          bucket, 
          paths: uncachedPaths,
          sensitive: options.sensitive 
        }
      });

      if (error) throw error;

      if (data?.signedUrls) {
        for (const [path, url] of Object.entries(data.signedUrls)) {
          const cacheKey = `${bucket}:${path}`;
          urlCache.set(cacheKey, {
            url: url as string,
            expiresAt: data.expiresAt,
          });
          results[path] = url as string;
        }
      }

      return results;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert a public URL to a signed URL if needed
  const secureUrl = useCallback(async (publicUrl: string): Promise<string> => {
    // Parse the URL to extract bucket and path
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) {
      return publicUrl; // Not a storage URL
    }

    const [, bucket, path] = match;
    return getSignedUrl(bucket, path);
  }, [getSignedUrl]);

  // Clear the cache (useful after uploads)
  const clearCache = useCallback((bucket?: string, path?: string) => {
    if (bucket && path) {
      urlCache.delete(`${bucket}:${path}`);
    } else if (bucket) {
      for (const key of urlCache.keys()) {
        if (key.startsWith(`${bucket}:`)) {
          urlCache.delete(key);
        }
      }
    } else {
      urlCache.clear();
    }
  }, []);

  return {
    getSignedUrl,
    getSignedUrls,
    secureUrl,
    clearCache,
    loading,
  };
}
