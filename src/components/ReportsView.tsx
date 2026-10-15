import React, { useState } from 'react';
import {
  BarChart3,
  FileCheck,
  TrendingUp,
  Sparkles,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2,
  X,
  FileSpreadsheet,
  Package,
  ShoppingBag,
  FileText,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  exportSalesReport,
  exportPurchaseReport,
  exportInventoryReport,
  exportGSTR1Report,
  exportExpenseReport,
  exportComprehensiveAccountingPack,
  ExportFormat,
} from '../utils/csvExport';

export const ReportsView: React.FC = () => {
  const { transactions, expenses, metrics, items, parties, payments } = useBilling();
  const { profile } = useAuth();

  const [activeReportTab, setActiveReportTab] = useState<'gst' | 'pnl' | 'exports'>('gst');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [aiReportSummary, setAiReportSummary] = useState<any | null>(null);

  // Export filters state
  const [salesFormat, setSalesFormat] = useState<ExportFormat>('xlsx');
  const [salesStartDate, setSalesStartDate] = useState<string>('');
  const [salesEndDate, setSalesEndDate] = useState<string>('');
  const [salesPartyFilter, setSalesPartyFilter] = useState<string>('all');

  const [purchaseFormat, setPurchaseFormat] = useState<ExportFormat>('xlsx');
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>('');
  const [purchaseEndDate, setPurchaseEndDate] = useState<string>('');
  const [purchasePartyFilter, setPurchasePartyFilter] = useState<string>('all');

  const [inventoryFormat, setInventoryFormat] = useState<ExportFormat>('xlsx');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');

  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDownloadSuccessToast(msg);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  // GST Outward (Sales) Calculations
  const salesTransactions = transactions.filter((t) => t.type === 'sale');
  const purchaseTransactions = transactions.filter((t) => t.type === 'purchase');

  const gstr1Taxable = salesTransactions.reduce((acc, curr) => acc + curr.subtotal, 0);
  const gstr1Cgst = salesTransactions.reduce((acc, curr) => acc + curr.cgst, 0);
  const gstr1Sgst = salesTransactions.reduce((acc, curr) => acc + curr.sgst, 0);
  const gstr1Igst = salesTransactions.reduce((acc, curr) => acc + curr.igst, 0);
  const gstr1TotalTax = salesTransactions.reduce((acc, curr) => acc + curr.taxTotal, 0);

  // GST Inward (Purchases - Input Tax Credit ITC)
  const itcTaxable = purchaseTransactions.reduce((acc, curr) => acc + curr.subtotal, 0);
  const itcCgst = purchaseTransactions.reduce((acc, curr) => acc + curr.cgst, 0);
  const itcSgst = purchaseTransactions.reduce((acc, curr) => acc + curr.sgst, 0);
  const itcIgst = purchaseTransactions.reduce((acc, curr) => acc + curr.igst, 0);
  const itcTotalTax = purchaseTransactions.reduce((acc, curr) => acc + curr.taxTotal, 0);

  // GSTR-3B Net Tax Liability = Output Tax - Input Tax Credit
  const netGstPayable = Math.max(0, gstr1TotalTax - itcTotalTax);

  // HSN Breakdown
  const hsnMap: { [hsn: string]: { hsn: string; count: number; taxable: number; tax: number } } = {};
  salesTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const h = item.hsn || 'NON-HSN';
      if (!hsnMap[h]) {
        hsnMap[h] = { hsn: h, count: 0, taxable: 0, tax: 0 };
      }
      hsnMap[h].count += item.quantity;
      hsnMap[h].taxable += item.unitPrice * item.quantity;
      hsnMap[h].tax += item.taxAmount;
    });
  });

  const hsnList = Object.values(hsnMap);

  // Profit & Loss Values
  const totalRevenue = metrics.totalSales;
  const cogs = Math.max(0, metrics.totalSales - metrics.grossProfit);
  const grossProfit = metrics.grossProfit;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  const totalOperatingExpenses = metrics.totalExpenses;
  const netProfit = metrics.netProfit;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Distinct categories
  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));

  // AI Report Summarizer
  const handleSummarizeReport = async () => {
    setIsSummarizing(true);
    setAiReportSummary(null);
    try {
      const payload = {
        reportType: activeReportTab === 'gst' ? 'GST Filing & Tax Liability' : 'Profit & Loss Statement',
        reportData:
          activeReportTab === 'gst'
            ? {
                gstr1OutwardTaxable: gstr1Taxable,
                outputGstLiability: gstr1TotalTax,
                cgst: gstr1Cgst,
                sgst: gstr1Sgst,
                igst: gstr1Igst,
                inputTaxCreditAvailable: itcTotalTax,
                netGstPayable,
                totalInvoicesCount: salesTransactions.length,
              }
            : {
                totalRevenue,
                costOfGoodsSold: cogs,
                grossProfit,
                grossMarginPercent: grossMargin,
                operatingExpenses: totalOperatingExpenses,
                netProfit,
                netMarginPercent: netMargin,
              },
      };

      const res = await fetch('/api/ai/summarize-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate report summary');
      }
      setAiReportSummary(json.data);
    } catch (err: any) {
      alert(err?.message || 'Report summarization failed');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Financial Reports &amp; Accounting Exports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            GST returns, P&amp;L analysis, and CSV / Excel export for external accounting (Tally, Zoho, Marg, QuickBooks).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReportTab('exports')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs sm:text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV / Excel
          </button>

          <button
            onClick={handleSummarizeReport}
            disabled={isSummarizing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
          >
            {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Report Summary
          </button>

          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{downloadSuccessToast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg">
        <button
          onClick={() => {
            setActiveReportTab('gst');
            setAiReportSummary(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeReportTab === 'gst'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          GST Returns (GSTR-1 &amp; 3B)
        </button>
        <button
          onClick={() => {
            setActiveReportTab('pnl');
            setAiReportSummary(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeReportTab === 'pnl'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Profit &amp; Loss (P&amp;L)
        </button>
        <button
          onClick={() => {
            setActiveReportTab('exports');
            setAiReportSummary(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeReportTab === 'exports'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Center (CSV / Excel)</span>
        </button>
      </div>

      {/* AI Summary Banner (if generated) */}
      {aiReportSummary && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-slate-900/10 border border-indigo-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {aiReportSummary.title}
            </h3>
            <button onClick={() => setAiReportSummary(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {aiReportSummary.taxBreakdownSummary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-900/40">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Audit Highlights &amp; Tax Impact
              </p>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {aiReportSummary.keyHighlights?.map((h: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-900/40">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Compliance &amp; Optimization Checkpoints
              </p>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {aiReportSummary.actionPlan?.map((a: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: GST REPORTS */}
      {activeReportTab === 'gst' && (
        <div className="space-y-6">
          {/* GST Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                GSTR-1 Outward Supplies (Output GST)
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(gstr1TotalTax)}
              </p>
              <p className="text-xs text-slate-500">
                Taxable Base: <span className="font-mono font-semibold">{formatCurrency(gstr1Taxable)}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                GSTR-2 Eligible ITC (Input Tax Credit)
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(itcTotalTax)}
              </p>
              <p className="text-xs text-slate-500">
                Purchases Base: <span className="font-mono font-semibold">{formatCurrency(itcTaxable)}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                GSTR-3B Net Tax Payable
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(netGstPayable)}
              </p>
              <p className="text-xs text-slate-500">
                Output Tax ({formatCurrency(gstr1TotalTax)}) minus ITC ({formatCurrency(itcTotalTax)})
              </p>
            </div>
          </div>

          {/* Quick GSTR-1 Excel/CSV Export bar */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Export Official GSTR-1 Data</p>
                <p className="text-slate-500">Ready for GST portal offline tool and tax consultant audit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  exportGSTR1Report(transactions, 'xlsx');
                  showToast('GSTR-1 Excel report generated successfully!');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => {
                  exportGSTR1Report(transactions, 'csv');
                  showToast('GSTR-1 CSV report generated successfully!');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* Detailed GST Tax Breakup Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Tax Breakup: Output Tax vs Input Tax Credit
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Taxable Turnover</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">Total GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                      Output Tax (Sales Invoices)
                    </td>
                    <td className="p-3 text-right">{formatCurrency(gstr1Taxable)}</td>
                    <td className="p-3 text-right">{formatCurrency(gstr1Cgst)}</td>
                    <td className="p-3 text-right">{formatCurrency(gstr1Sgst)}</td>
                    <td className="p-3 text-right">{formatCurrency(gstr1Igst)}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(gstr1TotalTax)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                      Input Tax Credit (Purchase Bills)
                    </td>
                    <td className="p-3 text-right">{formatCurrency(itcTaxable)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatCurrency(itcCgst)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatCurrency(itcSgst)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatCurrency(itcIgst)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {formatCurrency(itcTotalTax)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                    <td className="p-3 font-sans text-rose-600 dark:text-rose-400">
                      Net Tax Payable (Cash Ledger Requirement)
                    </td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(Math.max(0, gstr1Cgst - itcCgst))}</td>
                    <td className="p-3 text-right">{formatCurrency(Math.max(0, gstr1Sgst - itcSgst))}</td>
                    <td className="p-3 text-right">{formatCurrency(Math.max(0, gstr1Igst - itcIgst))}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                      {formatCurrency(netGstPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* HSN Wise Summary */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              HSN Wise Sales Summary (Mandatory for GSTR-1 Table 12)
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">HSN Code</th>
                    <th className="p-3 text-center">Total Quantity</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {hsnList.map((h, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{h.hsn}</td>
                      <td className="p-3 text-center">{h.count} units</td>
                      <td className="p-3 text-right">{formatCurrency(h.taxable)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(h.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS STATEMENT */}
      {activeReportTab === 'pnl' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 max-w-3xl">
            <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {profile?.businessName || 'Business Enterprise'}
              </h3>
              <p className="text-xs text-slate-500">Statement of Profit &amp; Loss</p>
              <p className="text-xs text-slate-400 font-mono">
                FY {new Date().getFullYear()}-{new Date().getFullYear() + 1}
              </p>
            </div>

            {/* Income Section */}
            <div className="space-y-2 text-xs sm:text-sm">
              <p className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                I. Revenue from Operations
              </p>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Gross Sales Revenue</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-rose-600">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span className="font-mono">-{formatCurrency(cogs)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/40 px-3 rounded-lg">
                <span>Gross Profit (Margin: {grossMargin}%)</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grossProfit)}
                </span>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div className="space-y-2 text-xs sm:text-sm pt-4">
              <p className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                II. Operating &amp; Overhead Expenses
              </p>
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between py-1 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span>
                    {e.title} <span className="text-[10px] text-slate-400">({e.category})</span>
                  </span>
                  <span className="font-mono">{formatCurrency(e.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <span>Total Operating Expenses</span>
                <span className="font-mono text-rose-600">-{formatCurrency(totalOperatingExpenses)}</span>
              </div>
            </div>

            {/* Net Profit Bottom Line */}
            <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between items-center">
              <div>
                <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white block">
                  NET PROFIT FOR THE PERIOD
                </span>
                <span className="text-xs text-slate-500">Net Profit Margin: {netMargin}%</span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNTING EXPORTS CENTER (CSV & EXCEL) */}
      {activeReportTab === 'exports' && (
        <div className="space-y-6">
          {/* Master Accounting Pack Hero Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/40 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Complete Audit Pack
                  </span>
                  <span className="text-xs text-slate-400">Multi-Sheet Excel Workbook</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  All-in-One Accounting Workbook (.xlsx)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Export a unified spreadsheet containing Sales Register, Purchase Register, Stock Valuation, Expenses Journal, and Customer/Supplier Ledgers on separate sheets. Ideal for Chartered Accountants and external tax audits.
                </p>
              </div>

              <button
                onClick={() => {
                  exportComprehensiveAccountingPack({
                    transactions,
                    items,
                    expenses,
                    payments,
                    parties,
                  });
                  showToast('Comprehensive Multi-Sheet Accounting Pack downloaded successfully!');
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Master Accounting Pack (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Individual Report Exporters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. SALES REPORT EXPORTER */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Sales Register Report</h4>
                      <p className="text-[11px] text-slate-500">{salesTransactions.length} Total Invoices</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Detailed register with invoice numbers, customer GSTIN, tax components (CGST, SGST, IGST), and payment statuses.
                </p>

                {/* Date Filters */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={salesStartDate}
                        onChange={(e) => setSalesStartDate(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={salesEndDate}
                        onChange={(e) => setSalesEndDate(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Customer Filter</label>
                    <select
                      value={salesPartyFilter}
                      onChange={(e) => setSalesPartyFilter(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="all">All Customers</option>
                      {parties
                        .filter((p) => p.type === 'customer')
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Format Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Export Format</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSalesFormat('xlsx')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          salesFormat === 'xlsx'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesFormat('csv')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          salesFormat === 'csv'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        CSV (.csv)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportSalesReport(transactions, salesFormat, {
                    startDate: salesStartDate || undefined,
                    endDate: salesEndDate || undefined,
                    partyName: salesPartyFilter !== 'all' ? salesPartyFilter : undefined,
                  });
                  showToast(`Sales Register exported in ${salesFormat.toUpperCase()} format!`);
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Sales ({salesFormat.toUpperCase()})</span>
              </button>
            </div>

            {/* 2. PURCHASE REPORT EXPORTER */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Purchase Bills Report</h4>
                      <p className="text-[11px] text-slate-500">{purchaseTransactions.length} Total Bills</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full list of inward vendor bills, supplier GSTINs, ITC eligible credit amounts, and payment status.
                </p>

                {/* Date Filters */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={purchaseStartDate}
                        onChange={(e) => setPurchaseStartDate(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={purchaseEndDate}
                        onChange={(e) => setPurchaseEndDate(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Supplier Filter</label>
                    <select
                      value={purchasePartyFilter}
                      onChange={(e) => setPurchasePartyFilter(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="all">All Suppliers / Vendors</option>
                      {parties
                        .filter((p) => p.type === 'supplier')
                        .map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Format Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Export Format</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPurchaseFormat('xlsx')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          purchaseFormat === 'xlsx'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseFormat('csv')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          purchaseFormat === 'csv'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        CSV (.csv)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportPurchaseReport(transactions, purchaseFormat, {
                    startDate: purchaseStartDate || undefined,
                    endDate: purchaseEndDate || undefined,
                    partyName: purchasePartyFilter !== 'all' ? purchasePartyFilter : undefined,
                  });
                  showToast(`Purchase Register exported in ${purchaseFormat.toUpperCase()} format!`);
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Purchases ({purchaseFormat.toUpperCase()})</span>
              </button>
            </div>

            {/* 3. INVENTORY & STOCK VALUATION EXPORTER */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Inventory &amp; Valuation</h4>
                      <p className="text-[11px] text-slate-500">{items.length} Catalog SKUs</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Complete stock balances, HSN codes, purchase costs, retail valuations, and reorder warning statuses.
                </p>

                {/* Filters */}
                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Item Category</label>
                    <select
                      value={inventoryCategoryFilter}
                      onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Summary Metric */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block">Total Stock Valuation (Cost):</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(items.reduce((acc, curr) => acc + curr.stock * curr.purchasePrice, 0))}
                    </span>
                  </div>

                  {/* Format Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Export Format</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setInventoryFormat('xlsx')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          inventoryFormat === 'xlsx'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInventoryFormat('csv')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                          inventoryFormat === 'csv'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        CSV (.csv)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  exportInventoryReport(items, inventoryFormat, inventoryCategoryFilter);
                  showToast(`Inventory Valuation exported in ${inventoryFormat.toUpperCase()} format!`);
                }}
                className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Inventory ({inventoryFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* Secondary Quick Export Options (Expenses & GSTR-1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Operating Expenses Journal</p>
                <p className="text-slate-500">Categorized expenses with tax-deductible flags</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    exportExpenseReport(expenses, 'xlsx');
                    showToast('Expenses Journal exported to Excel!');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Excel
                </button>
                <button
                  onClick={() => {
                    exportExpenseReport(expenses, 'csv');
                    showToast('Expenses Journal exported to CSV!');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  CSV
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">GSTR-1 Outward Supplies</p>
                <p className="text-slate-500">Government format for invoice-by-invoice upload</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    exportGSTR1Report(transactions, 'xlsx');
                    showToast('GSTR-1 exported to Excel!');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Excel
                </button>
                <button
                  onClick={() => {
                    exportGSTR1Report(transactions, 'csv');
                    showToast('GSTR-1 exported to CSV!');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
