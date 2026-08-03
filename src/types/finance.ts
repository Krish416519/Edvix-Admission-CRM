import { 
  Payment, PaymentStatus, InvoiceStatus,
  UniversityPayout, Commission, LedgerEntry as SchemaLedgerEntry
} from './schema';

export type FinanceStatus = PaymentStatus;
export type { PaymentStatus, InvoiceStatus, UniversityPayout, Commission };

export interface FinanceRecord extends Payment {
  // Kept for backward compatibility if any legacy components still reference it temporarily
}

export interface LedgerEntry extends SchemaLedgerEntry {}
