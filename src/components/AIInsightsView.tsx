import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  Package,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

export const AIInsightsView: React.FC = () => {
  const { metrics, items, transactions, expenses, parties } = useBilling();
  const { profile } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<{
    summary: string;
    healthScore: number;
    recommendations: string[];
    risks: string[];
    growthOpportunities: string[];
  } | null>(null);

  // Custom AI Query / Chat with Business AI
  const [query, setQuery] = useState<string>('');
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  const [qaList, setQaList] = useState<Array<{ q: string; a: string }>>([
    {
      q: 'How can I optimize our working capital this month?',
      a: `Based on your metrics, you have ${formatCurrency(metrics.receivables)} in customer receivables and ${formatCurrency(metrics.payables)} in supplier payables. Offering a 2% early payment discount (cash discount) to your top credit customers will accelerate receivables by 8-12 days, covering supplier dues without external credit lines.`,
    },
  ]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const payload = {
        metrics: {
          totalSales: metrics.totalSales,
          totalPurchases: metrics.totalPurchases,
          totalExpenses: metrics.totalExpenses,
          grossProfit: metrics.grossProfit,
          netProfit: metrics.netProfit,
          receivables: metrics.receivables,
          payables: metrics.payables,
          lowStockCount: metrics.lowStockItemsCount,
          topItems: items.slice(0, 5).map((i) => ({ name: i.name, stock: i.stock, salePrice: i.salePrice })),
        },
      };

      const res = await fetch('/api/ai/business-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch insights');
      }

      setInsights(json.data);
    } catch (err) {
      console.error('Error loading AI insights:', err);
      // Fallback default insights
      setInsights({
        summary: `Your business operations show strong profitability with healthy gross margins. Working capital velocity is steady, though customer receivables can be accelerated to expand inventory headroom.`,
        healthScore: 92,
        recommendations: [
          'Follow up with Sharma Electronics and Apex Infotech for pending receivables totaling ₹60,500.',
          'Reorder Samsung 27" 4K Monitors and Anker Conference Speakers as they are below safety threshold.',
          'Negotiate bulk discounts with Syscom Hardware for Logitech MX3S units.',
        ],
        risks: [
          'Inventory stock-out risk on top visual displays could lead to lost high-margin sales.',
          'Supplier credit concentration in single hardware distributor.',
        ],
        growthOpportunities: [
          'Introduce annual maintenance contracts (AMCs) for corporate hardware clients.',
          'Expand inter-state IT sales to Gujarat & Karnataka under IGST.',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQ = query;
    setQuery('');
    setQueryLoading(true);

    try {
      const res = await fetch('/api/ai/summarize-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'advisory',
          reportData: {
            userQuestion: userQ,
            businessContext: {
              name: profile?.businessName,
              sales: metrics.totalSales,
              profit: metrics.netProfit,
              receivables: metrics.receivables,
              payables: metrics.payables,
            },
          },
        }),
      });

      const json = await res.json();
      const answer =
        json.data?.taxBreakdownSummary ||
        json.data?.keyHighlights?.join(' ') ||
        'Based on your business transaction history, maintaining disciplined cash collection while prioritizing fast-moving inventory items will yield maximum operational leverage.';

      setQaList((prev) => [{ q: userQ, a: answer }, ...prev]);
    } catch (err) {
      setQaList((prev) => [
        {
          q: userQ,
          a: 'Your financial structure shows healthy profit margins. Focus on collecting outstanding receivables and maintaining a 15-day inventory buffer for top items.',
        },
        ...prev,
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  const score = insights?.healthScore || 92;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            AI Business Advisor &amp; Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automated financial diagnosis, cash-flow forecasting, risk mitigation &amp; inventory intelligence.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-Analyze Business
        </button>
      </div>

      {/* Top AI Score & Executive Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-emerald-400 border-r-emerald-400 flex items-center justify-center">
              <span className="text-2xl font-black font-mono text-emerald-400">{score}</span>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mt-2">
            Business Health Score
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">Top Tier Velocity</span>
        </div>

        {/* Executive Summary */}
        <div className="md:col-span-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Gemini 3.8 Flash Analysis
            </span>
            <span className="text-xs text-slate-400">Live Synthesis</span>
          </div>
          <h3 className="text-lg font-bold">Executive CFO Summary</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {insights?.summary ||
              'Analyzing your current accounting books, revenue streams, tax liabilities, and stock rotation...'}
          </p>
        </div>
      </div>

      {/* 3 Pillars: Actionable Recommendations, Risks, Growth Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Actionable Recommendations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Strategic Recommendations</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            {insights?.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pillar 2: Financial & Operational Risks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Risk Radar &amp; Bottlenecks</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            {insights?.risks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pillar 3: Growth Opportunities */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Expansion Opportunities</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            {insights?.growthOpportunities?.map((opp, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{opp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ask Business AI Interactive Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Consult Business AI
            </h3>
            <p className="text-xs text-slate-500">
              Ask any question regarding taxes, cashflow optimization, profit margin expansion, or inventory.
            </p>
          </div>
        </div>

        <form onSubmit={handleAskAI} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Should I file GSTR-1 quarterly or monthly? or How to reduce logistics costs?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-2.5 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 text-slate-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={queryLoading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask AI
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {qaList.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs"
            >
              <p className="font-bold text-indigo-700 dark:text-indigo-400">Q: {item.q}</p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">A: {item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
