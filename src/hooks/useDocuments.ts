import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Document, DocumentStatus, DocumentVersion, DocumentVerification } from '../types/schema';
import { toast } from 'sonner';
import { 
  validateFile, 
  getBucketForDocumentType, 
  generateStoragePath, 
  uploadFileToStorage, 
  getSignedFileUrl,
  calculateChecksum
} from '../lib/documentStorage';
import { useAuth } from '../contexts/AuthContext';

export function useDocuments(admissionId?: string, leadId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    if (!admissionId && !leadId) return;
    
    setIsLoading(true);
    try {
      let query = supabase.from('documents').select('*');
      
      if (admissionId) {
        query = query.eq('admission_id', admissionId);
      } else if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      
      query = query.is('deleted_at', null).order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      const formattedDocs = (data || []).map(doc => ({
        id: doc.id,
        documentNumber: doc.document_number,
        leadId: doc.lead_id,
        admissionId: doc.admission_id,
        studentName: doc.student_name,
        
        documentType: doc.document_type,
        bucketName: doc.bucket_name,
        storagePath: doc.storage_path,
        
        originalFileName: doc.original_file_name,
        storedFileName: doc.stored_file_name,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        checksum: doc.checksum,
        
        version: doc.version,
        verificationStatus: doc.verification_status as DocumentStatus,
        remarks: doc.remarks,
        
        uploadedBy: doc.uploaded_by,
        verifiedBy: doc.verified_by,
        verificationDate: doc.verification_date,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        
        // Legacy mappings
        name: doc.original_file_name,
        type: doc.document_type,
        url: doc.storage_path,
        size: `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB`,
        status: doc.verification_status,
        uploadedAt: doc.created_at
      })) as Document[];
      
      setDocuments(formattedDocs);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [admissionId, leadId]);

  useEffect(() => {
    fetchDocuments();

    // Subscribe to realtime updates
    if (!admissionId && !leadId) return;
    
    let filterString = '';
    if (admissionId) filterString = `admission_id=eq.${admissionId}`;
    else if (leadId) filterString = `lead_id=eq.${leadId}`;
    
    const channelId = `documents_rt_${admissionId || leadId}_${Date.now()}`;
    const subscription = supabase.channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: filterString },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchDocuments, admissionId, leadId]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────

  const uploadDocument = async (file: File, type: string, remarks?: string) => {
    try {
      // 1. Validation
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return { success: false, error: validation.error };
      }

      // 2. Resolve target ID for path generation
      let actualLeadId = leadId;
      if (!actualLeadId && admissionId) {
        const { data } = await supabase.from('admissions').select('lead_id').eq('id', admissionId).single();
        actualLeadId = data?.lead_id;
      }
      
      // 3. Storage Upload
      const bucket = getBucketForDocumentType(type);
      const storagePath = generateStoragePath(actualLeadId, admissionId, file);
      
      const checksum = await calculateChecksum(file);
      await uploadFileToStorage(bucket, storagePath, file);

      // 4. DB Insert
      const payload = {
        lead_id: actualLeadId,
        admission_id: admissionId,
        document_type: type,
        bucket_name: bucket,
        storage_path: storagePath,
        original_file_name: file.name,
        stored_file_name: storagePath.split('/').pop(),
        file_size: file.size,
        file_type: file.type,
        checksum: checksum,
        version: 1,
        verification_status: 'Pending',
        remarks: remarks,
        uploaded_by: user?.id,
      };

      const { data, error: dbError } = await supabase
        .from('documents')
        .insert(payload)
        .select()
        .single();

      if (dbError) {
        // DB Failed, cleanup storage (fire and forget)
        supabase.storage.from(bucket).remove([storagePath]);
        throw dbError;
      }
      
      toast.success('Document uploaded successfully');
      return { success: true, data };
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
      return { success: false, error };
    }
  };

  const replaceDocument = async (documentId: string, newFile: File, remarks?: string) => {
     try {
      // 1. Validation
      const validation = validateFile(newFile);
      if (!validation.valid) {
        toast.error(validation.error);
        return { success: false, error: validation.error };
      }

      const existingDoc = documents.find(d => d.id === documentId);
      if (!existingDoc) throw new Error("Document not found");

      // 2. Storage Upload
      const bucket = getBucketForDocumentType(existingDoc.documentType);
      const storagePath = generateStoragePath(existingDoc.leadId, existingDoc.admissionId, newFile);
      
      const checksum = await calculateChecksum(newFile);
      await uploadFileToStorage(bucket, storagePath, newFile);

      // 3. DB Update
      const payload = {
        bucket_name: bucket,
        storage_path: storagePath,
        original_file_name: newFile.name,
        stored_file_name: storagePath.split('/').pop(),
        file_size: newFile.size,
        file_type: newFile.type,
        checksum: checksum,
        version: existingDoc.version + 1,
        verification_status: 'Pending', // Resets verification status
        remarks: remarks || existingDoc.remarks,
        uploaded_by: user?.id,
        updated_at: new Date().toISOString()
      };

      const { data, error: dbError } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', documentId)
        .select()
        .single();

      if (dbError) {
        supabase.storage.from(bucket).remove([storagePath]);
        throw dbError;
      }
      
      toast.success('Document replaced successfully (Version ' + payload.version + ')');
      return { success: true, data };
    } catch (error: any) {
      console.error('Replace error:', error);
      toast.error(error.message || 'Failed to replace document');
      return { success: false, error };
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      // Soft Delete
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Document deleted');
      return { success: true };
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
      return { success: false, error };
    }
  };

  const getSignedUrl = async (documentIdOrPath: string) => {
    try {
      let bucket = 'documents';
      let path = documentIdOrPath;
      
      // If a UUID is passed, lookup the doc to get the bucket and path
      if (documentIdOrPath.includes('-')) {
         const doc = documents.find(d => d.id === documentIdOrPath);
         if (doc) {
             bucket = doc.bucketName;
             path = doc.storagePath;
         } else {
             // Try fetching from DB if not in local state
             const { data } = await supabase.from('documents').select('bucket_name, storage_path').eq('id', documentIdOrPath).single();
             if (data) {
                 bucket = data.bucket_name;
                 path = data.storage_path;
             }
         }
      }

      return await getSignedFileUrl(bucket as any, path, 3600); // 1 hour expiry
    } catch (error: any) {
      console.error('Error generating signed URL:', error);
      toast.error('Failed to generate preview URL');
      return null;
    }
  };
  
  const updateDocumentStatus = async (id: string, status: DocumentStatus, comments?: string) => {
    try {
      const payload: any = { 
        verification_status: status, 
      };
      if (comments) payload.remarks = comments;

      const { error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success(`Document marked as ${status}`);
      return { success: true };
    } catch (error: any) {
      console.error('Update status error:', error);
      toast.error('Failed to update document status');
      return { success: false, error };
    }
  };

  const fetchVersionHistory = async (documentId: string): Promise<DocumentVersion[]> => {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      documentId: d.document_id,
      versionNumber: d.version_number,
      bucketName: d.bucket_name,
      storagePath: d.storage_path,
      originalFileName: d.original_file_name,
      storedFileName: d.stored_file_name,
      fileSize: d.file_size,
      fileType: d.file_type,
      checksum: d.checksum,
      uploadedBy: d.uploaded_by,
      uploadedAt: d.uploaded_at
    }));
  };

  const fetchVerificationHistory = async (documentId: string): Promise<DocumentVerification[]> => {
    const { data, error } = await supabase
      .from('document_verification')
      .select('*')
      .eq('document_id', documentId)
      .order('verified_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      documentId: d.document_id,
      previousStatus: d.previous_status,
      newStatus: d.new_status,
      comments: d.comments,
      verifiedBy: d.verified_by,
      verifiedByName: d.verified_by_name,
      verifiedAt: d.verified_at
    }));
  };

  return {
    documents,
    isLoading,
    fetchDocuments,
    uploadDocument,
    replaceDocument,
    deleteDocument,
    getSignedUrl,
    updateDocumentStatus,
    fetchVersionHistory,
    fetchVerificationHistory
  };
}
