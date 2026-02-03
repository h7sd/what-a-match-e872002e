/**
 * Client-side AES-256-GCM encryption for file uploads and data
 * All sensitive data is encrypted before transmission/storage
 */

// ============= KEY DERIVATION =============

// Derive encryption key from user-specific data + server secret
export async function deriveEncryptionKey(keyMaterial: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  // Import as raw key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-256-GCM key using PBKDF2
  const salt = encoder.encode('uservault-file-encryption-v1');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Derive a separate key for API payload encryption
export async function deriveApiEncryptionKey(keyMaterial: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Different salt for API encryption
  const salt = encoder.encode('uservault-api-encryption-v1');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 50000, // Faster for API calls
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============= FILE ENCRYPTION =============

// Encrypt a file using AES-256-GCM
export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const fileBuffer = await file.arrayBuffer();
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );
  
  // Prepend IV to encrypted data for storage
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  return {
    encryptedBlob: new Blob([combined], { type: 'application/octet-stream' }),
    iv,
  };
}

// Decrypt file data
export async function decryptFile(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  originalMimeType: string
): Promise<Blob> {
  const data = new Uint8Array(encryptedData);
  
  // Extract IV (first 12 bytes)
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new Blob([decryptedBuffer], { type: originalMimeType });
}

// Decrypt and create object URL for display
export async function decryptToObjectUrl(
  encryptedUrl: string,
  key: CryptoKey,
  mimeType: string
): Promise<string> {
  const response = await fetch(encryptedUrl);
  const encryptedData = await response.arrayBuffer();
  const decryptedBlob = await decryptFile(encryptedData, key, mimeType);
  return URL.createObjectURL(decryptedBlob);
}

// Check if a URL points to an encrypted file (by checking metadata)
export function isEncryptedFile(url: string): boolean {
  return url.includes('/encrypted/') || url.includes('.enc');
}

// Encode metadata for encrypted files
export function encodeFileMetadata(originalName: string, mimeType: string): string {
  const metadata = { n: originalName, t: mimeType, v: 1 };
  return btoa(JSON.stringify(metadata));
}

// Decode file metadata
export function decodeFileMetadata(encoded: string): { name: string; type: string } | null {
  try {
    const metadata = JSON.parse(atob(encoded));
    return { name: metadata.n, type: metadata.t };
  } catch {
    return null;
  }
}

// ============= STRING/DATA ENCRYPTION =============

// Encrypt a string using AES-256-GCM
export async function encryptString(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(plaintext);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a string
export async function decryptString(ciphertext: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  return decoder.decode(decryptedBuffer);
}

// Encrypt an object (JSON serializable)
export async function encryptObject<T>(obj: T, key: CryptoKey): Promise<string> {
  const json = JSON.stringify(obj);
  return encryptString(json, key);
}

// Decrypt an object
export async function decryptObject<T>(ciphertext: string, key: CryptoKey): Promise<T> {
  const json = await decryptString(ciphertext, key);
  return JSON.parse(json);
}

// ============= API PAYLOAD ENCRYPTION =============

// Encrypt API request payload
export async function encryptApiPayload(payload: unknown, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify(payload));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt API response payload
export async function decryptApiPayload<T>(encrypted: string, iv: string, key: CryptoKey): Promise<T> {
  const decoder = new TextDecoder();
  
  const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encryptedData
  );
  
  return JSON.parse(decoder.decode(decryptedBuffer));
}

// ============= DATABASE FIELD ENCRYPTION =============

// Encrypt sensitive database field (for storing in DB)
export async function encryptField(value: string, key: CryptoKey): Promise<string> {
  if (!value) return value;
  const encrypted = await encryptString(value, key);
  return `ENC:${encrypted}`; // Prefix to identify encrypted fields
}

// Decrypt database field
export async function decryptField(value: string, key: CryptoKey): Promise<string> {
  if (!value || !value.startsWith('ENC:')) return value;
  const ciphertext = value.substring(4);
  return decryptString(ciphertext, key);
}

// Check if a field is encrypted
export function isEncryptedField(value: string): boolean {
  return value?.startsWith('ENC:') ?? false;
}

// ============= URL SIGNING =============

// Generate a signed URL token (client-side, for verification on server)
export async function generateSignedUrlToken(
  url: string, 
  expiresAt: number, 
  key: CryptoKey
): Promise<string> {
  const payload = { url, exp: expiresAt };
  return encryptObject(payload, key);
}

// Verify a signed URL token
export async function verifySignedUrlToken(
  token: string, 
  expectedUrl: string, 
  key: CryptoKey
): Promise<boolean> {
  try {
    const payload = await decryptObject<{ url: string; exp: number }>(token, key);
    const now = Date.now();
    return payload.url === expectedUrl && payload.exp > now;
  } catch {
    return false;
  }
}
