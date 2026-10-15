import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Receipt,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Plus,
  Mic,
  Eye,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardProps {
  onOpenCreateInvoice: () => void;
  onOpenVoiceBilling: () => void;
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenCreateInvoice,
  onOpenVoiceBilling,
  onSelectTransaction,
  onNavigateTab,
}) => {
  const { metrics, transactions, items } = useBilling();
  const { profile } = useAuth();

  // Filter low stock items
  const lowStockItems = items.filter((item) => item.stock <= item.minStockAlert);

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6);

  // Profit Margin calculation
  const profitMargin =
    metrics.totalSales > 0 ? Math.round((metrics.netProfit / metrics.totalSales) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & AI Health Pulse */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-5 sm:p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                AI Business Health Active
              </span>
              <span className="text-xs text-slate-400">
                FY {new Date().getFullYear()}-{new Date().getFullYear() + 1}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Welcome back, {profile?.ownerName || 'Business Leader'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
              Your business velocity is up this quarter. Net margin is{' '}
              <span className="text-emerald-400 font-bold font-mono">{profitMargin}%</span>. You have{' '}
              <span className="text-amber-400 font-bold font-mono">{lowStockItems.length}</span> low-stock items
              requiring replenishment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenVoiceBilling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 hover:from-indigo-500/40 hover:to-purple-500/40 border border-indigo-400/40 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all"
            >
              <Mic className="w-4 h-4 text-indigo-300 animate-pulse" />
              Voice Billing
            </button>
            <button
              onClick={onOpenCreateInvoice}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Sale
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Sales, Purchase, Profit, Expenses, Outstanding */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(metrics.totalSales)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              Revenue Driver
            </p>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Purchases</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(metrics.totalPurchases)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Stock Inward
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Net Profit</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(metrics.netProfit)}
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
              Margin: {profitMargin}%
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div
          onClick={() => onNavigateTab('expenses')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 cursor-pointer hover:border-amber-400/60 transition-all group"
          title="Click to view AI Expense Categorizer & Monthly Spend Breakdowns"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold group-hover:text-amber-600 transition-colors">Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(metrics.totalExpenses)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              AI Monthly Spends →
            </p>
          </div>
        </div>

        {/* To Receive (Receivables) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">To Receive</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(metrics.receivables)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Customer Dues
            </p>
          </div>
        </div>

        {/* To Pay (Payables) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">To Pay</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(metrics.payables)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Supplier Bills
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock AI Alert Banner (if any) */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                AI Inventory Warning: {lowStockItems.length} Products Running Low
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                {lowStockItems.map((i) => `${i.name} (${i.stock} left)`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0"
          >
            Review &amp; Reorder Stock
          </button>
        </div>
      )}

      {/* Automated Recurring Billing & MRR Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-slate-900/5 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                Automated Client Subscriptions &amp; Retainers
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                MRR: {formatCurrency(metrics.monthlyRecurringRevenue || 0)}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.recurringActiveCount || 0} active subscriptions scheduled. Automate repeat client billing seamlessly.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('subscriptions')}
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors flex items-center gap-1.5"
        >
          <span>Manage Subscriptions</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Two Column Layout: Recent Transactions + Quick Actions / AI Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Recent Transactions &amp; Invoices
            </h3>
            <button
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.type === 'sale'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : tx.type === 'purchase'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {tx.invoiceNumber}
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                      {tx.partyName}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{formatDate(tx.date)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(tx.grandTotal)}
                    </td>
                    <td className="p-3 text-center">
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
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="View / Download PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Actions & AI Advisor Teaser (1 col) */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenCreateInvoice}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/80 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Create Sale</p>
                <p className="text-[10px] text-slate-500">GST Invoice</p>
              </button>

              <button
                onClick={() => onNavigateTab('purchases')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Add Purchase</p>
                <p className="text-[10px] text-slate-500">Vendor Bill</p>
              </button>

              <button
                onClick={() => onNavigateTab('parties')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Add Customer</p>
                <p className="text-[10px] text-slate-500">Parties ledger</p>
              </button>

              <button
                onClick={() => onNavigateTab('inventory')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700/80 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Add Product</p>
                <p className="text-[10px] text-slate-500">Stock &amp; HSN</p>
              </button>
            </div>
          </div>

          {/* AI Advisor Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-slate-900 border border-indigo-500/20 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  CFO Financial Pulse
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Powered by Gemini 3.8 Flash
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your accounts receivable turnover is healthy. Collecting{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(metrics.receivables)}
              </span>{' '}
              will boost working capital for seasonal bulk purchasing discounts.
            </p>

            <button
              onClick={() => onNavigateTab('ai-insights')}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              Open AI CFO Advisor
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
