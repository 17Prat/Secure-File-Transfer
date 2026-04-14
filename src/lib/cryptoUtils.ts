/**
 * Cryptography utilities using the Web Crypto API.
 * Implements AES-GCM for file encryption and RSA-OAEP for key protection.
 */

// --- AES-GCM Utilities ---

/**
 * Generates a random AES-256 key.
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a base64 string.
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Imports a CryptoKey from a base64 string.
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const binaryKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'raw',
    binaryKey,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a file using AES-GCM.
 * Returns the encrypted data prepended with the IV.
 */
export async function encryptFile(file: File, key: CryptoKey): Promise<Blob> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileBuffer
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([combined], { type: 'application/octet-stream' });
}

/**
 * Decrypts data using AES-GCM.
 * Assumes the first 12 bytes are the IV.
 */
export async function decryptFile(data: ArrayBuffer, key: CryptoKey): Promise<Blob> {
  const iv = data.slice(0, 12);
  const encryptedContent = data.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    encryptedContent
  );

  return new Blob([decryptedBuffer], { type: 'application/octet-stream' });
}

// --- RSA Utilities ---

/**
 * Generates an RSA-OAEP key pair.
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a small piece of data (like an AES key) using an RSA public key.
 */
export async function encryptWithRSA(data: Uint8Array, publicKey: CryptoKey): Promise<string> {
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    data
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * Decrypts data using an RSA private key.
 */
export async function decryptWithRSA(encryptedBase64: string, privateKey: CryptoKey): Promise<Uint8Array> {
  const encryptedData = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedData
  );
  return new Uint8Array(decrypted);
}
