import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Share2,
  Calendar,
  DollarSign,
  Download,
  Printer,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportSalesReport, exportPurchaseReport } from '../utils/csvExport';

interface TransactionsListViewProps {
  defaultType?: 'sale' | 'purchase' | 'all';
  onOpenCreateInvoice: (type?: TransactionType) => void;
  onSelectTransaction: (txn: Transaction) => void;
}

export const TransactionsListView: React.FC<TransactionsListViewProps> = ({
  defaultType = 'all',
  onOpenCreateInvoice,
  onSelectTransaction,
}) => {
  const { transactions, deleteTransaction } = useBilling();

  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'purchase' | 'returns'>(
    defaultType === 'all' ? 'all' : defaultType
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = transactions.filter((t) => {
    // Type filter
    if (typeFilter === 'sale' && t.type !== 'sale') return false;
    if (typeFilter === 'purchase' && t.type !== 'purchase') return false;
    if (typeFilter === 'returns' && t.type !== 'sale_return' && t.type !== 'purchase_return') return false;

    // Status filter
    if (statusFilter !== 'all' && t.paymentStatus !== statusFilter) return false;

    // Search filter
    const matchSearch =
      t.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.partyName.toLowerCase().includes(search.toLowerCase()) ||
      (t.partyPhone && t.partyPhone.includes(search));

    return matchSearch;
  });

  const totalAmount = filtered.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalBalance = filtered.reduce((acc, curr) => acc + curr.balanceAmount, 0);

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {typeFilter === 'sale'
              ? 'Sales & Invoices'
              : typeFilter === 'purchase'
              ? 'Purchases & Vendor Bills'
              : 'All Business Transactions'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            GST &amp; Non-GST invoices, purchase vouchers, credit notes, and payment tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Options: Excel & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              onClick={() => {
                if (typeFilter === 'purchase') {
                  exportPurchaseReport(filtered, 'xlsx');
                } else {
                  exportSalesReport(filtered, 'xlsx');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all"
              title="Export filtered transactions to Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <span className="w-px h-4 bg-slate-200 dark:border-slate-700" />
            <button
              onClick={() => {
                if (typeFilter === 'purchase') {
                  exportPurchaseReport(filtered, 'csv');
                } else {
                  exportSalesReport(filtered, 'csv');
                }
              }}
              className="px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm transition-all"
              title="Export filtered transactions to CSV (.csv)"
            >
              CSV
            </button>
          </div>

          {typeFilter !== 'purchase' && (
            <button
              onClick={() => onOpenCreateInvoice('sale')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Sale Invoice
            </button>
          )}
          {typeFilter !== 'sale' && (
            <button
              onClick={() => onOpenCreateInvoice('purchase')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Purchase Bill
            </button>
          )}
        </div>
      </div>

      {/* Summary Chips & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Transactions</span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
            {filtered.length} Invoices
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Volume Amount</span>
          <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Unpaid Balance</span>
          <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalBalance)}
          </span>
        </div>

        <div className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-2 font-semibold rounded-lg ${
              statusFilter === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`flex-1 py-2 font-semibold rounded-lg ${
              statusFilter === 'paid' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold' : 'text-slate-500'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`flex-1 py-2 font-semibold rounded-lg ${
              statusFilter === 'partial' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold' : 'text-slate-500'
            }`}
          >
            Partial
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`flex-1 py-2 font-semibold rounded-lg ${
              statusFilter === 'unpaid' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold' : 'text-slate-500'
            }`}
          >
            Unpaid
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg border ${
              typeFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('sale')}
            className={`px-3 py-1.5 rounded-lg border ${
              typeFilter === 'sale'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setTypeFilter('purchase')}
            className={`px-3 py-1.5 rounded-lg border ${
              typeFilter === 'purchase'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setTypeFilter('returns')}
            className={`px-3 py-1.5 rounded-lg border ${
              typeFilter === 'returns'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Returns
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Party / Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">GST Total</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'sale'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : tx.type === 'purchase'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    {tx.invoiceNumber}
                  </td>

                  <td className="p-3.5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{tx.partyName}</p>
                      {tx.partyPhone && (
                        <p className="text-[11px] text-slate-400">{tx.partyPhone}</p>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</td>

                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatCurrency(tx.subtotal)}
                  </td>

                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatCurrency(tx.taxTotal)}
                  </td>

                  <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                    {formatCurrency(tx.grandTotal)}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(tx.balanceAmount)}
                  </td>

                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.paymentStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : tx.paymentStatus === 'partial'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      {tx.paymentStatus}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                        title="View & Download PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete invoice #${tx.invoiceNumber}?`)) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
