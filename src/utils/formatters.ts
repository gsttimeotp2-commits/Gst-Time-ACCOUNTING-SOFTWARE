// Indian Currency and Date Formatting Utilities

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Convert number to Indian English words for Invoices
export function numberToWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundreds = remainder;

  let result = '';
  if (crore > 0) result += inWords(crore) + ' Crore ';
  if (lakh > 0) result += inWords(lakh) + ' Lakh ';
  if (thousand > 0) result += inWords(thousand) + ' Thousand ';
  if (hundreds > 0) result += inWords(hundreds) + ' ';

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

// Calculate Indian GST splits
export function calculateTax(
  taxableAmount: number,
  taxRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; totalTax: number } {
  const totalTax = (taxableAmount * taxRate) / 100;
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
    };
  } else {
    const half = totalTax / 2;
    return {
      cgst: half,
      sgst: half,
      igst: 0,
      totalTax,
    };
  }
}

// Compute next billing date based on recurrence frequency
export function computeNextBillingDate(
  fromDate: string,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): string {
  const d = new Date(fromDate);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];

  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }

  return d.toISOString().split('T')[0];
}
