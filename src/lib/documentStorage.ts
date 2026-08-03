import { supabase } from './supabase';

export const BUCKETS = {
  STUDENT_DOCS: 'documents',
  PAYMENT_RECEIPTS: 'documents',
  PROFILE_PHOTOS: 'documents',
  UNIVERSITY_DOCS: 'documents',
  SYSTEM_FILES: 'documents'
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

// Max 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024; 

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before upload
 */
export function validateFile(file: File): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not supported. Please upload PDF, JPG, PNG, or DOC/DOCX. (Got: ${file.type || 'Unknown'})`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 10MB limit. (Got: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
    };
  }

  return { valid: true };
}

/**
 * Maps a document type string to a specific storage bucket
 */
export function getBucketForDocumentType(type: string): BucketName {
  const t = type.toLowerCase();
  
  if (t.includes('payment') || t.includes('receipt') || t.includes('invoice')) {
    return BUCKETS.PAYMENT_RECEIPTS;
  }
  
  if (t.includes('photo') || t.includes('avatar')) {
    return BUCKETS.PROFILE_PHOTOS;
  }
  
  if (t.includes('university') || t.includes('affiliation') || t.includes('mou')) {
    return BUCKETS.UNIVERSITY_DOCS;
  }
  
  // Default for Aadhar, PAN, Marksheets, Certificates, etc.
  return BUCKETS.STUDENT_DOCS;
}

/**
 * Generates a clean, unique storage path for a file
 */
export function generateStoragePath(leadId: string | undefined, admissionId: string | undefined, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  const cleanName = file.name
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[^a-z0-9]/gi, '_') // replace non-alphanumeric with underscore
    .toLowerCase();
    
  const prefix = admissionId ? `admissions/${admissionId}` : (leadId ? `leads/${leadId}` : 'uncategorized');
  
  return `${prefix}/${cleanName}_${timestamp}_${randomStr}.${ext}`;
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFileToStorage(bucket: BucketName, path: string, file: File) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false // We use unique paths (with timestamp) to avoid overwriting
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Gets a temporary signed URL for viewing/downloading private files
 */
export async function getSignedFileUrl(bucket: BucketName, path: string, expiresInSeconds: number = 3600) {
  if (!path) return null;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Permanently deletes a file from storage
 */
export async function deleteFileFromStorage(bucket: BucketName, path: string) {
  if (!path) return;
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error(`Error deleting file from storage (${bucket}/${path}):`, error);
    throw error;
  }
}

/**
 * Simple hash generator for checksums (if crypto API is available)
 */
export async function calculateChecksum(file: File): Promise<string | undefined> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Failed to calculate checksum', e);
      return undefined;
    }
  }
  return undefined;
}
