import * as XLSX from 'xlsx';
import { Transaction, Item, Expense, PaymentRecord, Party } from '../types';
import { formatDate } from './formatters';

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportFilterOptions {
  startDate?: string;
  endDate?: string;
  partyName?: string;
  category?: string;
}

// Clean escape helper for CSV values to ensure seamless Microsoft Excel and Google Sheets parsing
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }
  return str;
}

// Download CSV file with UTF-8 BOM so Microsoft Excel renders numbers and characters cleanly
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const headerLine = headers.map(escapeCSV).join(',');
  const rowLines = rows.map((row) => row.map(escapeCSV).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download XLSX file using SheetJS with auto column widths
export function downloadXLSX(
  filename: string,
  sheets: { sheetName: string; headers: string[]; rows: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, headers, rows }) => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-calculate column widths based on contents
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      rows.forEach((row) => {
        const val = row[colIdx] ? String(row[colIdx]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  });

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

// Helper to download either CSV or XLSX
function triggerDownload(
  baseFilename: string,
  headers: string[],
  rows: (string | number)[][],
  format: ExportFormat = 'xlsx',
  sheetName: string = 'Sheet1'
) {
  const dateStr = new Date().toISOString().split('T')[0];
  if (format === 'csv') {
    downloadCSV(`${baseFilename}_${dateStr}.csv`, headers, rows);
  } else {
    downloadXLSX(`${baseFilename}_${dateStr}.xlsx`, [{ sheetName, headers, rows }]);
  }
}

// 1. Export Sales Invoices Report
export function exportSalesReport(
  transactions: Transaction[],
  format: ExportFormat = 'xlsx',
  filters?: ExportFilterOptions
) {
  let sales = transactions.filter((t) => t.type === 'sale');

  if (filters?.startDate) {
    sales = sales.filter((t) => t.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    sales = sales.filter((t) => t.date <= filters.endDate!);
  }
  if (filters?.partyName && filters.partyName !== 'all') {
    sales = sales.filter((t) => t.partyName.toLowerCase() === filters.partyName!.toLowerCase());
  }

  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Due Date',
    'Party / Customer Name',
    'Customer Phone',
    'Customer GSTIN',
    'Supply Type',
    'Taxable Subtotal (INR)',
    'CGST (INR)',
    'SGST (INR)',
    'IGST (INR)',
    'Total Tax (INR)',
    'Grand Total (INR)',
    'Paid Amount (INR)',
    'Balance Due (INR)',
    'Payment Mode',
    'Payment Status',
    'Item Summary',
  ];

  const rows = sales.map((tx) => [
    tx.invoiceNumber,
    formatDate(tx.date),
    tx.dueDate ? formatDate(tx.dueDate) : '',
    tx.partyName,
    tx.partyPhone || '',
    tx.partyGstin || '',
    tx.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
    Number(tx.subtotal.toFixed(2)),
    Number(tx.cgst.toFixed(2)),
    Number(tx.sgst.toFixed(2)),
    Number(tx.igst.toFixed(2)),
    Number(tx.taxTotal.toFixed(2)),
    Number(tx.grandTotal.toFixed(2)),
    Number(tx.paidAmount.toFixed(2)),
    Number(tx.balanceAmount.toFixed(2)),
    tx.paymentMode,
    tx.paymentStatus.toUpperCase(),
    tx.items.map((i) => `${i.name} (Qty: ${i.quantity} ${i.unit})`).join('; '),
  ]);

  triggerDownload('Sales_Register_Report', headers, rows, format, 'Sales Invoices');
}

// 2. Export Purchase Bills Report
export function exportPurchaseReport(
  transactions: Transaction[],
  format: ExportFormat = 'xlsx',
  filters?: ExportFilterOptions
) {
  let purchases = transactions.filter((t) => t.type === 'purchase');

  if (filters?.startDate) {
    purchases = purchases.filter((t) => t.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    purchases = purchases.filter((t) => t.date <= filters.endDate!);
  }
  if (filters?.partyName && filters.partyName !== 'all') {
    purchases = purchases.filter((t) => t.partyName.toLowerCase() === filters.partyName!.toLowerCase());
  }

  const headers = [
    'Bill Number',
    'Bill Date',
    'Supplier / Vendor Name',
    'Supplier Phone',
    'Supplier GSTIN',
    'Supply Type',
    'Taxable Value (INR)',
    'CGST (INR)',
    'SGST (INR)',
    'IGST (INR)',
    'Input Tax Credit (INR)',
    'Bill Grand Total (INR)',
    'Paid Amount (INR)',
    'Balance Due (INR)',
    'Payment Mode',
    'Payment Status',
    'Items Purchased',
  ];

  const rows = purchases.map((tx) => [
    tx.invoiceNumber,
    formatDate(tx.date),
    tx.partyName,
    tx.partyPhone || '',
    tx.partyGstin || '',
    tx.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
    Number(tx.subtotal.toFixed(2)),
    Number(tx.cgst.toFixed(2)),
    Number(tx.sgst.toFixed(2)),
    Number(tx.igst.toFixed(2)),
    Number(tx.taxTotal.toFixed(2)),
    Number(tx.grandTotal.toFixed(2)),
    Number(tx.paidAmount.toFixed(2)),
    Number(tx.balanceAmount.toFixed(2)),
    tx.paymentMode,
    tx.paymentStatus.toUpperCase(),
    tx.items.map((i) => `${i.name} (Qty: ${i.quantity} ${i.unit})`).join('; '),
  ]);

  triggerDownload('Purchase_Register_Report', headers, rows, format, 'Purchase Bills');
}

// 3. Export Inventory Stock Report
export function exportInventoryReport(
  items: Item[],
  format: ExportFormat = 'xlsx',
  categoryFilter?: string
) {
  let filteredItems = items;
  if (categoryFilter && categoryFilter !== 'all') {
    filteredItems = items.filter((i) => (i.category || 'General').toLowerCase() === categoryFilter.toLowerCase());
  }

  const headers = [
    'Product / Item Name',
    'SKU',
    'HSN / SAC Code',
    'Category',
    'Unit of Measure',
    'Sale Price (INR)',
    'Purchase Cost (INR)',
    'GST Rate (%)',
    'Current Stock',
    'Min Stock Alert Level',
    'Stock Valuation at Cost (INR)',
    'Stock Valuation at Retail (INR)',
    'Estimated Gross Profit (INR)',
    'Stock Health Status',
  ];

  const rows = filteredItems.map((item) => {
    const isLow = item.stock <= item.minStockAlert;
    const valueAtCost = item.stock * item.purchasePrice;
    const valueAtSale = item.stock * item.salePrice;
    const potentialMargin = Math.max(0, valueAtSale - valueAtCost);

    return [
      item.name,
      item.sku || '',
      item.hsn || '',
      item.category || 'General',
      item.unit,
      Number(item.salePrice.toFixed(2)),
      Number(item.purchasePrice.toFixed(2)),
      item.taxRate,
      item.stock,
      item.minStockAlert,
      Number(valueAtCost.toFixed(2)),
      Number(valueAtSale.toFixed(2)),
      Number(potentialMargin.toFixed(2)),
      isLow ? 'LOW STOCK ALERT' : 'OPTIMAL IN STOCK',
    ];
  });

  triggerDownload('Inventory_Stock_Report', headers, rows, format, 'Inventory Valuation');
}

// 4. Export GSTR-1 Ready Sales Breakdown
export function exportGSTR1Report(transactions: Transaction[], format: ExportFormat = 'xlsx') {
  const sales = transactions.filter((t) => t.type === 'sale');
  const headers = [
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Invoice Number',
    'Invoice Date',
    'Invoice Value',
    'Place Of Supply',
    'Reverse Charge',
    'Applicable % of Tax Rate',
    'Invoice Type',
    'E-Commerce GSTIN',
    'Rate',
    'Taxable Value',
    'Cess Amount',
  ];

  const rows: (string | number)[][] = [];

  sales.forEach((tx) => {
    tx.items.forEach((item) => {
      rows.push([
        tx.partyGstin || 'URP',
        tx.partyName,
        tx.invoiceNumber,
        formatDate(tx.date),
        Number(tx.grandTotal.toFixed(2)),
        tx.isInterState ? 'Inter-State' : 'Intra-State',
        'N',
        '',
        'Regular',
        '',
        item.taxRate,
        Number((item.quantity * item.unitPrice - item.discount).toFixed(2)),
        '0.00',
      ]);
    });
  });

  triggerDownload('GSTR1_Filing_Report', headers, rows, format, 'GSTR-1 Outward');
}

// 5. Export Expense Journal
export function exportExpenseReport(expenses: Expense[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Expense ID',
    'Date',
    'Title / Description',
    'Category',
    'Amount (INR)',
    'Payment Mode',
    'Tax Deductible',
    'Notes',
  ];

  const rows = expenses.map((e) => [
    e.id,
    formatDate(e.date),
    e.title,
    e.category,
    Number(e.amount.toFixed(2)),
    e.paymentMode,
    e.taxDeductible ? 'YES' : 'NO',
    e.notes || '',
  ]);

  triggerDownload('Expense_Journal_Report', headers, rows, format, 'Expenses');
}

// 6. Complete Comprehensive Accounting Pack (Multi-Sheet Excel or ZIP / CSV bundle)
export function exportComprehensiveAccountingPack(data: {
  transactions: Transaction[];
  items: Item[];
  expenses: Expense[];
  payments: PaymentRecord[];
  parties: Party[];
}) {
  const { transactions, items, expenses, payments, parties } = data;
  const sales = transactions.filter((t) => t.type === 'sale');
  const purchases = transactions.filter((t) => t.type === 'purchase');

  // Sheet 1: Sales Register
  const salesHeaders = [
    'Invoice No',
    'Date',
    'Party Name',
    'Party GSTIN',
    'Subtotal (INR)',
    'Tax Total (INR)',
    'Grand Total (INR)',
    'Paid (INR)',
    'Balance (INR)',
    'Payment Mode',
    'Status',
  ];
  const salesRows = sales.map((tx) => [
    tx.invoiceNumber,
    formatDate(tx.date),
    tx.partyName,
    tx.partyGstin || '',
    Number(tx.subtotal.toFixed(2)),
    Number(tx.taxTotal.toFixed(2)),
    Number(tx.grandTotal.toFixed(2)),
    Number(tx.paidAmount.toFixed(2)),
    Number(tx.balanceAmount.toFixed(2)),
    tx.paymentMode,
    tx.paymentStatus.toUpperCase(),
  ]);

  // Sheet 2: Purchase Register
  const purchaseHeaders = [
    'Bill No',
    'Date',
    'Supplier Name',
    'Supplier GSTIN',
    'Taxable (INR)',
    'Input Tax Credit (INR)',
    'Grand Total (INR)',
    'Paid (INR)',
    'Balance (INR)',
    'Status',
  ];
  const purchaseRows = purchases.map((tx) => [
    tx.invoiceNumber,
    formatDate(tx.date),
    tx.partyName,
    tx.partyGstin || '',
    Number(tx.subtotal.toFixed(2)),
    Number(tx.taxTotal.toFixed(2)),
    Number(tx.grandTotal.toFixed(2)),
    Number(tx.paidAmount.toFixed(2)),
    Number(tx.balanceAmount.toFixed(2)),
    tx.paymentStatus.toUpperCase(),
  ]);

  // Sheet 3: Stock Valuation
  const stockHeaders = [
    'Item Name',
    'SKU',
    'HSN',
    'Category',
    'Stock Qty',
    'Unit',
    'Cost Price (INR)',
    'Sale Price (INR)',
    'Stock Value (Cost)',
    'Stock Value (Retail)',
    'Stock Alert Status',
  ];
  const stockRows = items.map((item) => [
    item.name,
    item.sku || '',
    item.hsn || '',
    item.category || 'General',
    item.stock,
    item.unit,
    Number(item.purchasePrice.toFixed(2)),
    Number(item.salePrice.toFixed(2)),
    Number((item.stock * item.purchasePrice).toFixed(2)),
    Number((item.stock * item.salePrice).toFixed(2)),
    item.stock <= item.minStockAlert ? 'LOW STOCK' : 'OK',
  ]);

  // Sheet 4: Expenses
  const expHeaders = ['Date', 'Title', 'Category', 'Amount (INR)', 'Payment Mode', 'Tax Deductible'];
  const expRows = expenses.map((e) => [
    formatDate(e.date),
    e.title,
    e.category,
    Number(e.amount.toFixed(2)),
    e.paymentMode,
    e.taxDeductible ? 'YES' : 'NO',
  ]);

  // Sheet 5: Customer & Supplier Ledger Balances
  const partyHeaders = [
    'Party Name',
    'Type',
    'Phone',
    'GSTIN',
    'Current Balance (INR)',
    'Balance Status',
  ];
  const partyRows = parties.map((p) => [
    p.name,
    p.type.toUpperCase(),
    p.phone || '',
    p.gstin || '',
    Number(p.currentBalance.toFixed(2)),
    p.type === 'customer'
      ? p.currentBalance > 0
        ? 'RECEIVABLE (To Collect)'
        : 'CLEARED'
      : p.currentBalance > 0
      ? 'PAYABLE (To Pay)'
      : 'CLEARED',
  ]);

  const sheets = [
    { sheetName: 'Sales Register', headers: salesHeaders, rows: salesRows },
    { sheetName: 'Purchase Register', headers: purchaseHeaders, rows: purchaseRows },
    { sheetName: 'Stock Valuation', headers: stockHeaders, rows: stockRows },
    { sheetName: 'Expenses Journal', headers: expHeaders, rows: expRows },
    { sheetName: 'Party Ledger Balances', headers: partyHeaders, rows: partyRows },
  ];

  const dateStr = new Date().toISOString().split('T')[0];
  downloadXLSX(`BillPulse_Comprehensive_Accounting_Pack_${dateStr}.xlsx`, sheets);
}
