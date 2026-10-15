import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Sparkles,
  Trash2,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  BarChart2,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Check,
  Zap,
  Tag,
  Building,
  CreditCard,
  Download,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { Expense } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportExpenseReport } from '../utils/csvExport';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = useBilling();

  // Active View Mode: Ledger vs Monthly Breakdown
  const [activeViewTab, setActiveViewTab] = useState<'ledger' | 'monthly'>('ledger');

  // Record Expense Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Rent & Office');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [taxDeductible, setTaxDeductible] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // AI Single Expense Categorization state
  const [isCategorizingSingle, setIsCategorizingSingle] = useState<boolean>(false);
  const [aiCategorizationResult, setAiCategorizationResult] = useState<{
    category: string;
    confidence: number;
    taxDeductible: boolean;
    taxReason?: string;
    normalizedTitle?: string;
  } | null>(null);

  // AI Batch Categorizer Modal state
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchRawText, setBatchRawText] = useState<string>(
    'Swiggy corporate lunch for client meeting Rs 1850\n' +
      'AWS cloud hosting server monthly subscription Rs 4200\n' +
      'BlueDart air express courier charges to Delhi Rs 850\n' +
      'Shop commercial electricity meter bill Rs 3100\n' +
      'Office printer toner cartridge replacement Rs 1200\n' +
      'Fastag toll & delivery van diesel recharge Rs 2500'
  );
  const [isParsingBatch, setIsParsingBatch] = useState<boolean>(false);
  const [batchParsedResults, setBatchParsedResults] = useState<any[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [batchSaveSuccess, setBatchSaveSuccess] = useState<string | null>(null);

  // Monthly Breakdown State & Filters
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [isAnalyzingMonthlySpend, setIsAnalyzingMonthlySpend] = useState<boolean>(false);
  const [monthlyAIAnalysis, setMonthlyAIAnalysis] = useState<any | null>(null);

  const categories = [
    'Rent & Office',
    'Logistics & Courier',
    'Utilities & Internet',
    'Salaries & Wages',
    'Marketing & Advertising',
    'Cloud & Software (SaaS)',
    'Repair & Maintenance',
    'Legal & Professional Fees',
    'Travel & Fuel',
    'Food & Team Welfare',
    'Packaging & Supplies',
    'Taxes & Government Fees',
    'Miscellaneous',
  ];

  // Helper to format Month Key (YYYY-MM to "October 2026")
  const formatMonthName = (monthKey: string) => {
    if (!monthKey || monthKey === 'all') return 'All Months';
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  // Group Expenses by Month (YYYY-MM)
  const monthlyData = useMemo(() => {
    const map: {
      [key: string]: {
        monthKey: string;
        monthLabel: string;
        total: number;
        taxDeductibleTotal: number;
        count: number;
        categories: { [cat: string]: number };
        expenses: Expense[];
      };
    } = {};

    expenses.forEach((e) => {
      const monthKey = e.date ? e.date.substring(0, 7) : '2026-10';
      if (!map[monthKey]) {
        map[monthKey] = {
          monthKey,
          monthLabel: formatMonthName(monthKey),
          total: 0,
          taxDeductibleTotal: 0,
          count: 0,
          categories: {},
          expenses: [],
        };
      }

      map[monthKey].total += e.amount;
      if (e.taxDeductible) map[monthKey].taxDeductibleTotal += e.amount;
      map[monthKey].count += 1;
      map[monthKey].expenses.push(e);

      const cat = e.category || 'Miscellaneous';
      map[monthKey].categories[cat] = (map[monthKey].categories[cat] || 0) + e.amount;
    });

    // Sort chronologically descending
    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [expenses]);

  // Available Month Keys
  const availableMonths = monthlyData.map((m) => m.monthKey);

  // Active Month Group
  const activeMonthGroup = useMemo(() => {
    if (selectedMonthKey === 'all') {
      const allTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      const allDeductible = expenses
        .filter((e) => e.taxDeductible)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const allCats: { [cat: string]: number } = {};
      expenses.forEach((e) => {
        allCats[e.category] = (allCats[e.category] || 0) + e.amount;
      });
      return {
        monthKey: 'all',
        monthLabel: 'All Recorded Time',
        total: allTotal,
        taxDeductibleTotal: allDeductible,
        count: expenses.length,
        categories: allCats,
        expenses,
      };
    }
    return (
      monthlyData.find((m) => m.monthKey === selectedMonthKey) ||
      monthlyData[0] || {
        monthKey: 'all',
        monthLabel: 'No Data',
        total: 0,
        taxDeductibleTotal: 0,
        count: 0,
        categories: {},
        expenses: [],
      }
    );
  }, [selectedMonthKey, monthlyData, expenses]);

  // Previous Month for Growth Comparison
  const previousMonthGroup = useMemo(() => {
    if (selectedMonthKey === 'all') return null;
    const currentIdx = monthlyData.findIndex((m) => m.monthKey === selectedMonthKey);
    if (currentIdx !== -1 && currentIdx + 1 < monthlyData.length) {
      return monthlyData[currentIdx + 1];
    }
    return null;
  }, [selectedMonthKey, monthlyData]);

  // Month-over-Month calculation
  const momGrowth = useMemo(() => {
    if (!previousMonthGroup || previousMonthGroup.total === 0) return null;
    const diff = activeMonthGroup.total - previousMonthGroup.total;
    const pct = ((diff / previousMonthGroup.total) * 100).toFixed(1);
    return { diff, pct: parseFloat(pct) };
  }, [activeMonthGroup, previousMonthGroup]);

  // Sorted Category Spend for Active View
  const sortedCategories = useMemo(() => {
    return Object.entries(activeMonthGroup.categories)
      .map(([catName, amt]) => ({
        name: catName,
        amount: amt,
        percentage: activeMonthGroup.total > 0 ? (amt / activeMonthGroup.total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeMonthGroup]);

  // AI Real-Time Auto-Categorize for Single Expense
  const handleAICategorizeSingle = async () => {
    if (!title.trim()) {
      alert('Please enter an expense description first (e.g., "Swiggy office lunch" or "AWS hosting").');
      return;
    }

    setIsCategorizingSingle(true);
    setAiCategorizationResult(null);

    try {
      const res = await fetch('/api/ai/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: title,
          amount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to categorize expense');
      }

      const data = json.data;
      setAiCategorizationResult(data);
      if (data.category) setCategory(data.category);
      if (data.taxDeductible !== undefined) setTaxDeductible(data.taxDeductible);
      if (data.suggestedPaymentMode) setPaymentMode(data.suggestedPaymentMode);
      if (data.taxReason) setNotes(data.taxReason);
    } catch (err: any) {
      alert(err?.message || 'AI Categorization failed');
    } finally {
      setIsCategorizingSingle(false);
    }
  };

  // Submit Single Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    await addExpense({
      category,
      title: aiCategorizationResult?.normalizedTitle || title,
      amount,
      date,
      paymentMode,
      taxDeductible,
      notes: notes || aiCategorizationResult?.taxReason,
    });

    setShowAddModal(false);
    setTitle('');
    setAmount(0);
    setNotes('');
    setAiCategorizationResult(null);
  };

  // Parse Batch Raw Text with Gemini
  const handleParseBatchExpenses = async () => {
    if (!batchRawText.trim()) return;

    setIsParsingBatch(true);
    setBatchParsedResults([]);

    try {
      // Split lines and prepare items
      const rawLines = batchRawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 2);

      const items = rawLines.map((line, idx) => {
        // Try simple regex extraction for number/amount if present
        const matchAmt = line.match(/(?:Rs\.?|INR|₹|\s|^)(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
        let extractedAmount = 0;
        if (matchAmt) {
          extractedAmount = parseFloat(matchAmt[1].replace(/,/g, '')) || 0;
        }
        return {
          id: `raw_${idx}`,
          description: line,
          amount: extractedAmount,
        };
      });

      const res = await fetch('/api/ai/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to batch categorize');
      }

      // Combine results with extracted amount
      const parsed = (json.data || []).map((item: any, i: number) => ({
        ...item,
        amount: items[i]?.amount || 500,
        date: new Date().toISOString().split('T')[0],
        selected: true,
      }));

      setBatchParsedResults(parsed);
    } catch (err: any) {
      alert('Batch parsing error: ' + err?.message);
    } finally {
      setIsParsingBatch(false);
    }
  };

  // Save Approved Batch Expenses to Firestore Ledger
  const handleSaveBatchExpenses = async () => {
    const selectedItems = batchParsedResults.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setIsSavingBatch(true);
    try {
      for (const item of selectedItems) {
        await addExpense({
          category: item.category || 'Miscellaneous',
          title: item.normalizedTitle || item.originalDescription,
          amount: Number(item.amount) || 0,
          date: item.date || new Date().toISOString().split('T')[0],
          paymentMode: item.suggestedPaymentMode || 'UPI',
          taxDeductible: item.taxDeductible ?? true,
          notes: item.taxReason || 'AI auto-categorized',
        });
      }

      setBatchSaveSuccess(`Successfully imported and categorized ${selectedItems.length} expenses!`);
      setTimeout(() => {
        setBatchSaveSuccess(null);
        setShowBatchModal(false);
        setBatchParsedResults([]);
      }, 2000);
    } catch (err: any) {
      alert('Error saving batch expenses: ' + err?.message);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Run AI Monthly Spend Analysis with Gemini
  const handleRunMonthlySpendAnalysis = async () => {
    setIsAnalyzingMonthlySpend(true);
    setMonthlyAIAnalysis(null);

    try {
      const payload = {
        monthlyBreakdown: monthlyData.map((m) => ({
          month: m.monthLabel,
          total: m.total,
          deductible: m.taxDeductibleTotal,
          count: m.count,
          categories: m.categories,
        })),
        totalSpend: activeMonthGroup.total,
        categoriesSummary: activeMonthGroup.categories,
      };

      const res = await fetch('/api/ai/monthly-spend-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze monthly spend');
      }

      setMonthlyAIAnalysis(json.data);
    } catch (err: any) {
      alert('Monthly spend analysis failed: ' + err?.message);
    } finally {
      setIsAnalyzingMonthlySpend(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            AI Expense Categorizer &amp; Monthly Spends
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automatically categorize business expenses with Gemini AI, audit monthly outflows, and track tax deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Batch Categorizer */}
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold text-xs sm:text-sm transition-all"
            title="Paste bank statements or transaction descriptions for batch AI categorization"
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">AI Batch Categorizer</span>
            <span className="sm:hidden">Batch AI</span>
          </button>

          {/* Export to Excel / CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              onClick={() => exportExpenseReport(expenses, 'xlsx')}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              title="Export Expenses to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => exportExpenseReport(expenses, 'csv')}
              className="px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              title="Export Expenses to CSV"
            >
              CSV
            </button>
          </div>

          {/* Record Expense Button */}
          <button
            onClick={() => {
              setAiCategorizationResult(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Top Navigation Tabs: Ledger vs Monthly Spend Breakdown */}
      <div className="flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-md">
        <button
          onClick={() => setActiveViewTab('ledger')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeViewTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Expenses Journal ({expenses.length})</span>
        </button>
        <button
          onClick={() => setActiveViewTab('monthly')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeViewTab === 'monthly'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Monthly Spend Breakdown</span>
        </button>
      </div>

      {/* VIEW TAB 1: EXPENSES JOURNAL & TABLE */}
      {activeViewTab === 'ledger' && (
        <div className="space-y-5">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Operating Outflow
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {formatCurrency(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tax-Deductible Spend
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    expenses.filter((e) => e.taxDeductible).reduce((acc, curr) => acc + curr.amount, 0)
                  )}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  AI Categorized Categories
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {new Set(expenses.map((e) => e.category)).size} Cost Centers
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Expense List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Expense Title / Description</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5 text-center">Tax Deductibility</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono">
                        {formatDate(exp.date)}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700/60">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{exp.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {exp.paymentMode}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.taxDeductible
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {exp.taxDeductible ? 'Tax Deductible (Sec 37)' : 'Personal / Non-Deductible'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Delete expense "${exp.title}"?`)) deleteExpense(exp.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: MONTHLY SPEND BREAKDOWN & AI AUDIT */}
      {activeViewTab === 'monthly' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Month Selector Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Month Period Selector
                </h3>
                <p className="text-xs text-slate-500">Filter and audit category spends for any billing cycle</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedMonthKey('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedMonthKey === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All Months
              </button>
              {availableMonths.map((mKey) => (
                <button
                  key={mKey}
                  onClick={() => setSelectedMonthKey(mKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedMonthKey === mKey
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {formatMonthName(mKey)}
                </button>
              ))}

              <button
                onClick={handleRunMonthlySpendAnalysis}
                disabled={isAnalyzingMonthlySpend}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 ml-auto sm:ml-2"
              >
                {isAnalyzingMonthlySpend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Run AI Spend Audit</span>
              </button>
            </div>
          </div>

          {/* Active Month Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {activeMonthGroup.monthLabel} Spend
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(activeMonthGroup.total)}
              </p>
              <p className="text-xs text-slate-400">{activeMonthGroup.count} Vouchers recorded</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Month-over-Month Velocity
              </span>
              {momGrowth ? (
                <div>
                  <p
                    className={`text-xl sm:text-2xl font-black font-mono flex items-center gap-1 ${
                      momGrowth.diff > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {momGrowth.diff > 0 ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                    {Math.abs(momGrowth.pct)}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {momGrowth.diff > 0 ? '+' : ''}
                    {formatCurrency(momGrowth.diff)} vs prior month
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xl sm:text-2xl font-black font-mono text-slate-400">Baseline</p>
                  <p className="text-xs text-slate-500">First recorded period</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Top Spending Cost Center
              </span>
              <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 truncate">
                {sortedCategories[0]?.name || 'N/A'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {formatCurrency(sortedCategories[0]?.amount || 0)} ({sortedCategories[0]?.percentage.toFixed(1)}%
                of month)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tax-Shielded Deductions
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activeMonthGroup.taxDeductibleTotal)}
              </p>
              <p className="text-xs text-slate-500">
                {(
                  (activeMonthGroup.taxDeductibleTotal / (activeMonthGroup.total || 1)) *
                  100
                ).toFixed(0)}
                % Qualified Under Sec 37
              </p>
            </div>
          </div>

          {/* AI Spend Analysis Banner (if generated) */}
          {monthlyAIAnalysis && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/25 via-indigo-950/20 to-slate-900/20 border border-purple-500/40 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      AI Executive Spend Audit &amp; Budget Insights
                    </h3>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      Analysis for {activeMonthGroup.monthLabel}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMonthlyAIAnalysis(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {monthlyAIAnalysis.executiveSummary}
              </p>

              <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-purple-200 dark:border-purple-900/40 text-xs">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">
                  Spend Velocity Commentary:
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {monthlyAIAnalysis.spendVelocityTrend}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Cost Saving Opportunities */}
                <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    High-Impact Cost Reduction Opportunities
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {monthlyAIAnalysis.costSavingOpportunities?.map((opp: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Anomalies Detected */}
                <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Anomalies &amp; Leakage Checkpoints
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {monthlyAIAnalysis.anomaliesDetected?.map((anom: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{anom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {monthlyAIAnalysis.taxOptimizationTip && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    <strong>Tax Tip:</strong> {monthlyAIAnalysis.taxOptimizationTip}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Category Spend Distribution Matrix with Visual Bars */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Category Spend Breakdown — {activeMonthGroup.monthLabel}
                </h3>
                <p className="text-xs text-slate-500">
                  Ranking and visual weight of each business cost center
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {sortedCategories.length} Categories
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {sortedCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-5 text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span>{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-500">{cat.percentage.toFixed(1)}%</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-indigo-600'
                          : idx === 1
                          ? 'bg-purple-600'
                          : idx === 2
                          ? 'bg-blue-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(Math.max(cat.percentage, 2), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Month-over-Month Cards Trajectory */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Historical Monthly Trajectory ({monthlyData.length} Billing Periods)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {monthlyData.map((m) => (
                <div
                  key={m.monthKey}
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedMonthKey === m.monthKey
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {m.monthLabel}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {m.count} bills
                    </span>
                  </div>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {formatCurrency(m.total)}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                    <span>Tax Deductible:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatCurrency(m.taxDeductibleTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD EXPENSE WITH AI AUTO-CATEGORIZATION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Record Business Expense
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateExpense}
              className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm"
            >
              {/* Description & AI Auto-Categorize Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Expense Title / Description *
                  </label>
                  <button
                    type="button"
                    onClick={handleAICategorizeSingle}
                    disabled={isCategorizingSingle}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isCategorizingSingle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>AI Auto-Categorize</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swiggy team dinner, AWS cloud servers, BlueDart express courier, shop rent"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Type any natural language narration or vendor bill title, then click AI Auto-Categorize.
                </p>
              </div>

              {/* AI Categorization Preview Banner */}
              {aiCategorizationResult && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1.5 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      AI Categorized: {aiCategorizationResult.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                      {Math.round(aiCategorizationResult.confidence * 100)}% Confidence
                    </span>
                  </div>
                  {aiCategorizationResult.normalizedTitle && (
                    <p className="text-slate-600 dark:text-slate-300">
                      Normalized: <strong>{aiCategorizationResult.normalizedTitle}</strong>
                    </p>
                  )}
                  {aiCategorizationResult.taxReason && (
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Tax Rule: {aiCategorizationResult.taxReason}
                    </p>
                  )}
                </div>
              )}

              {/* Category Selection */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 3500"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Payment Mode & Tax Deductible */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="taxDeductibleCheck"
                    checked={taxDeductible}
                    onChange={(e) => setTaxDeductible(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="taxDeductibleCheck"
                    className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Tax Deductible Business Expense
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tax Notes &amp; Invoice Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. GST invoice available, paid via corporate current account"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 resize-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Save to Expenses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH AI EXPENSE CATEGORIZER & IMPORTER */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-slate-900/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    AI Batch Expense Categorizer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste raw transaction descriptions from bank statements, UPI or cash slips
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {batchSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{batchSaveSuccess}</span>
                </div>
              )}

              {batchParsedResults.length === 0 ? (
                <div className="space-y-3">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Paste Raw Expenses (One per line with amount)
                  </label>
                  <textarea
                    rows={8}
                    value={batchRawText}
                    onChange={(e) => setBatchRawText(e.target.value)}
                    placeholder="Paste transaction lines here..."
                    className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Gemini AI will automatically detect categories, deductibility &amp; vendors.</span>
                    <button
                      type="button"
                      onClick={handleParseBatchExpenses}
                      disabled={isParsingBatch || !batchRawText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all"
                    >
                      {isParsingBatch ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Categorize All Lines</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      AI Categorized {batchParsedResults.length} Transactions
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchParsedResults([])}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Re-paste / Edit Lines
                    </button>
                  </div>

                  {/* Parsed Items List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {batchParsedResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const updated = [...batchParsedResults];
                              updated[idx].selected = e.target.checked;
                              setBatchParsedResults(updated);
                            }}
                            className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {item.normalizedTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Raw: {item.originalDescription}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                {item.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  item.taxDeductible
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {item.taxDeductible ? 'Deductible' : 'Non-Deductible'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Math.round((item.confidence || 0.9) * 100)}% match
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.amount}
                            onChange={(e) => {
                              const updated = [...batchParsedResults];
                              updated[idx].amount = parseFloat(e.target.value) || 0;
                              setBatchParsedResults(updated);
                            }}
                            className="w-24 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-right font-mono font-bold text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {batchParsedResults.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {batchParsedResults.filter((i) => i.selected).length} of{' '}
                  {batchParsedResults.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBatchExpenses}
                    disabled={isSavingBatch || batchParsedResults.filter((i) => i.selected).length === 0}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSavingBatch ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Import to Expenses</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
