import { Document } from './schema';
export * from './schema';

export type AdmissionDocument = Document;

export interface AdmissionChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}
