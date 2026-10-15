export type UserRole = 'owner' | 'cashier' | 'accountant';

export interface UserProfile {
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  state: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  invoiceTerms: string;
  defaultTemplate: 'modern' | 'classic' | 'compact';
  role: UserRole;
  updatedAt?: string;
}

export interface Party {
  id: string;
  userId: string;
  type: 'customer' | 'supplier';
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  billingAddress?: string;
  state?: string;
  openingBalance: number;
  currentBalance: number; // Positive = Receivable (for customer) or Payable (for supplier)
  createdAt: string;
}

export interface Item {
  id: string;
  userId: string;
  name: string;
  sku?: string;
  hsn?: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  minStockAlert: number;
  taxRate: number; // 0, 5, 12, 18, 28
  category?: string;
  description?: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  itemId?: string;
  name: string;
  hsn?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage or flat
  taxRate: number; // 0, 5, 12, 18, 28
  taxAmount: number;
  total: number;
}

export type TransactionType = 'sale' | 'purchase' | 'sale_return' | 'purchase_return';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  partyGstin?: string;
  partyAddress?: string;
  isInterState: boolean;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  template: 'modern' | 'classic' | 'compact';
  isGSTInvoice: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  title: string;
  amount: number;
  date: string;
  paymentMode: string;
  taxDeductible: boolean;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  type: 'in' | 'out'; // 'in' = received from customer, 'out' = paid to supplier
  partyId?: string;
  partyName: string;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Subscription {
  id: string;
  userId: string;
  clientPartyId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  frequency: SubscriptionFrequency;
  startDate: string;
  nextBillingDate: string;
  status: SubscriptionStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  isInterState: boolean;
  isGSTInvoice: boolean;
  paymentTermsDays: number;
  autoGenerate: boolean;
  generatedCount: number;
  lastGeneratedInvoiceId?: string;
  lastGeneratedDate?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessMetrics {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  receivables: number;
  payables: number;
  lowStockItemsCount: number;
  totalInvoicesCount: number;
  recurringActiveCount?: number;
  monthlyRecurringRevenue?: number;
}
