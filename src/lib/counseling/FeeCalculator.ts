import { ProgramFee, ProgramScholarship } from '../../types/schema';

export interface FeeCalculationResult {
  grossTotal: number;
  mandatoryChargesTotal: number;
  totalDiscount: number;
  estimatedPayable: number;
  isFinal: boolean;
  breakdown: {
    name: string;
    amount: number;
    isMandatory: boolean;
    type: 'Fee' | 'Discount';
  }[];
  warnings: string[];
}

export class FeeCalculator {
  /**
   * Calculates the estimated payable amount for a program.
   * If any mandatory fee components are missing or unverified, it flags `isFinal` as false.
   */
  static calculate(fees: ProgramFee[], scholarship?: ProgramScholarship): FeeCalculationResult {
    let grossTotal = 0;
    let mandatoryChargesTotal = 0;
    let totalDiscount = 0;
    let isFinal = true;
    const breakdown: FeeCalculationResult['breakdown'] = [];
    const warnings: string[] = [];

    if (!fees || fees.length === 0) {
      warnings.push('No fee data available for this program. Cannot calculate.');
      return {
        grossTotal: 0,
        mandatoryChargesTotal: 0,
        totalDiscount: 0,
        estimatedPayable: 0,
        isFinal: false,
        breakdown,
        warnings
      };
    }

    // Process Fees
    // Usually there should be Tuition, Application, and Examination fees.
    const feeCategoriesPresent = new Set(fees.map(f => f.feeCategory.toLowerCase()));
    
    // Safety check: ensure critical fees exist to call it "Final"
    if (!feeCategoriesPresent.has('tuition')) {
      isFinal = false;
      warnings.push('Tuition fee is missing.');
    }
    if (!feeCategoriesPresent.has('examination')) {
      isFinal = false;
      warnings.push('Examination fee is missing. Estimate may be incomplete.');
    }

    for (const fee of fees) {
      breakdown.push({
        name: fee.feeCategory,
        amount: fee.amount,
        isMandatory: fee.isMandatory,
        type: 'Fee'
      });

      grossTotal += fee.amount;
      if (fee.isMandatory) {
        mandatoryChargesTotal += fee.amount;
      }
    }

    // Process Scholarship/Discounts
    if (scholarship) {
      if (scholarship.discountAmount && scholarship.discountAmount > 0) {
        totalDiscount += scholarship.discountAmount;
        breakdown.push({
          name: scholarship.name,
          amount: -scholarship.discountAmount,
          isMandatory: false,
          type: 'Discount'
        });
      } else if (scholarship.discountPercentage && scholarship.discountPercentage > 0) {
        const discountAmt = (grossTotal * scholarship.discountPercentage) / 100;
        totalDiscount += discountAmt;
        breakdown.push({
          name: scholarship.name,
          amount: -discountAmt,
          isMandatory: false,
          type: 'Discount'
        });
      }
    }

    // Final calculations
    // Payable = Gross - Discounts
    // Ensure we don't go below mandatory charges unless discount specifically applies to them (usually they only apply to tuition)
    // For simplicity, applying discount to total gross.
    let estimatedPayable = grossTotal - totalDiscount;
    if (estimatedPayable < 0) estimatedPayable = 0;

    return {
      grossTotal,
      mandatoryChargesTotal,
      totalDiscount,
      estimatedPayable,
      isFinal,
      breakdown,
      warnings
    };
  }

  static calculateEmi(principal: number, downPayment: number, months: number, interestRateAnnual: number = 0, processingFee: number = 0) {
    const loanAmount = principal - downPayment + processingFee;
    if (loanAmount <= 0) return { emi: 0, totalPayable: principal };

    if (interestRateAnnual === 0) {
      // Zero Cost EMI
      return {
        emi: loanAmount / months,
        totalPayable: principal + processingFee
      };
    }

    const r = (interestRateAnnual / 12) / 100;
    const emi = (loanAmount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    
    return {
      emi,
      totalPayable: downPayment + (emi * months)
    };
  }
}
