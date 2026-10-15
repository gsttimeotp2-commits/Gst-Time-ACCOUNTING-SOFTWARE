import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { Subscription, SubscriptionFrequency, InvoiceLineItem, Transaction } from '../types';
import { formatCurrency, formatDate, calculateTax } from '../utils/formatters';

interface SubscriptionsViewProps {
  onViewGeneratedInvoice: (txn: Transaction) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ onViewGeneratedInvoice }) => {
  const {
    subscriptions,
    parties,
    items,
    transactions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    generateInvoiceFromSubscription,
    bulkProcessDueSubscriptions,
    metrics,
  } = useBilling();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Form Fields
  const [clientPartyId, setClientPartyId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nextBillingDate, setNextBillingDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(15);
  const [autoGenerate, setAutoGenerate] = useState<boolean>(true);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [isGSTInvoice, setIsGSTInvoice] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: `sub_li_new`,
      name: 'Monthly Professional Retainer / AMC Services',
      hsn: '998313',
      unit: 'Month',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      taxRate: 18,
      taxAmount: 1800,
      total: 11800,
    },
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  const dueCount = subscriptions.filter(
    (s) => s.status === 'active' && s.nextBillingDate && s.nextBillingDate <= todayStr
  ).length;

  const handleOpenAddModal = (prefill?: Partial<Subscription>) => {
    setEditingSub(null);
    setClientPartyId(prefill?.clientPartyId || '');
    setClientName(prefill?.clientName || '');
    setClientPhone(prefill?.clientPhone || '');
    setClientEmail(prefill?.clientEmail || '');
    setFrequency(prefill?.frequency || 'monthly');
    setStartDate(prefill?.startDate || todayStr);
    setNextBillingDate(prefill?.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setPaymentTermsDays(prefill?.paymentTermsDays || 15);
    setAutoGenerate(prefill?.autoGenerate ?? true);
    setIsInterState(prefill?.isInterState || false);
    setIsGSTInvoice(prefill?.isGSTInvoice ?? true);
    setNotes(prefill?.notes || '');
    setLineItems(
      prefill?.items || [
        {
          id: `sub_li_${Date.now()}`,
          name: 'Monthly Retainer Service',
          hsn: '998315',
          unit: 'Month',
          quantity: 1,
          unitPrice: 12000,
          discount: 0,
          taxRate: 18,
          taxAmount: 2160,
          total: 14160,
        },
      ]
    );
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setClientPartyId(sub.clientPartyId || '');
    setClientName(sub.clientName);
    setClientPhone(sub.clientPhone || '');
    setClientEmail(sub.clientEmail || '');
    setFrequency(sub.frequency);
    setStartDate(sub.startDate);
    setNextBillingDate(sub.nextBillingDate);
    setPaymentTermsDays(sub.paymentTermsDays || 15);
    setAutoGenerate(sub.autoGenerate);
    setIsInterState(sub.isInterState);
    setIsGSTInvoice(sub.isGSTInvoice);
    setNotes(sub.notes || '');
    setLineItems(sub.items);
    setShowModal(true);
  };

  const handlePartySelect = (pId: string) => {
    setClientPartyId(pId);
    const p = parties.find((party) => party.id === pId);
    if (p) {
      setClientName(p.name);
      setClientPhone(p.phone || '');
      setClientEmail(p.email || '');
    }
  };

  const handleUpdateLine = (id: string, updates: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...updates };

        if (updates.itemId) {
          const it = items.find((i) => i.id === updates.itemId);
          if (it) {
            merged.name = it.name;
            merged.hsn = it.hsn || '';
            merged.unit = it.unit || 'Pcs';
            merged.unitPrice = it.salePrice;
            merged.taxRate = it.taxRate;
          }
        }

        const qty = Number(merged.quantity) || 0;
        const price = Number(merged.unitPrice) || 0;
        const disc = Number(merged.discount) || 0;
        const rate = isGSTInvoice ? Number(merged.taxRate) || 0 : 0;
        const basic = Math.max(0, qty * price - disc);
        const taxVal = (basic * rate) / 100;

        merged.taxAmount = taxVal;
        merged.total = basic + taxVal;
        return merged;
      })
    );
  };

  const handleAddLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `sub_li_${Date.now()}`,
        name: '',
        hsn: '',
        unit: 'Month',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice - curr.discount), 0);
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;

  if (isGSTInvoice) {
    lineItems.forEach((li) => {
      const basic = Math.max(0, li.quantity * li.unitPrice - li.discount);
      const { cgst, sgst, igst, totalTax } = calculateTax(basic, li.taxRate || 0, isInterState);
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      taxTotal += totalTax;
    });
  }

  const grandTotal = Math.round(subtotal + taxTotal);

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || lineItems.length === 0) return;

    if (editingSub) {
      await updateSubscription(editingSub.id, {
        clientPartyId,
        clientName,
        clientPhone,
        clientEmail,
        frequency,
        startDate,
        nextBillingDate,
        items: lineItems,
        subtotal,
        discount: 0,
        taxTotal,
        cgst: cgstTotal,
        sgst: sgstTotal,
        igst: igstTotal,
        grandTotal,
        isInterState,
        isGSTInvoice,
        paymentTermsDays,
        autoGenerate,
        notes,
      });
    } else {
      await addSubscription({
        clientPartyId,
        clientName,
        clientPhone,
        clientEmail,
        frequency,
        startDate,
        nextBillingDate,
        status: 'active',
        items: lineItems,
        subtotal,
        discount: 0,
        taxTotal,
        cgst: cgstTotal,
        sgst: sgstTotal,
        igst: igstTotal,
        grandTotal,
        isInterState,
        isGSTInvoice,
        paymentTermsDays,
        autoGenerate,
        notes,
      });
    }
    setShowModal(false);
  };

  const handleGenerateInvoiceNow = async (sub: Subscription) => {
    try {
      const createdTxn = await generateInvoiceFromSubscription(sub.id);
      onViewGeneratedInvoice(createdTxn);
    } catch (err: any) {
      alert('Error generating invoice: ' + err?.message);
    }
  };

  const handleBulkProcess = async () => {
    setIsProcessingBulk(true);
    try {
      const count = await bulkProcessDueSubscriptions();
      setBulkSuccessMessage(`Successfully auto-generated and dispatched ${count} recurring invoices!`);
      setTimeout(() => setBulkSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Bulk process failed: ' + err?.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    const match =
      sub.clientName.toLowerCase().includes(search.toLowerCase()) ||
      sub.frequency.toLowerCase().includes(search.toLowerCase()) ||
      sub.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    return match;
  });

  // AI Repeat Client Opportunities
  const repeatClientSuggestions = parties
    .filter((p) => p.type === 'customer')
    .map((customer) => {
      const customerTxns = transactions.filter(
        (t) => t.partyId === customer.id || t.partyName.toLowerCase() === customer.name.toLowerCase()
      );
      const isAlreadySubscribed = subscriptions.some(
        (s) => s.clientPartyId === customer.id || s.clientName.toLowerCase() === customer.name.toLowerCase()
      );
      return { customer, count: customerTxns.length, isAlreadySubscribed };
    })
    .filter((entry) => entry.count >= 2 && !entry.isAlreadySubscribed);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Recurring Invoices &amp; Subscriptions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automate weekly, monthly, quarterly &amp; yearly billing schedules with 1-click invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dueCount > 0 && (
            <button
              onClick={handleBulkProcess}
              disabled={isProcessingBulk}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Run {dueCount} Due Invoices</span>
            </button>
          )}

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Recurring Schedule
          </button>
        </div>
      </div>

      {bulkSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{bulkSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards: MRR, Active Count, Next Due Invoices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Monthly Recurring Revenue (MRR)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(metrics.monthlyRecurringRevenue || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Recurring Clients
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {metrics.recurringActiveCount || 0} Subscriptions
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Invoices Due for Generation
            </span>
            <span className={`text-xl sm:text-2xl font-black font-mono ${dueCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {dueCount} Pending Today
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* AI Repeat Customer Opportunity Banner */}
      {repeatClientSuggestions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-slate-900/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                AI Opportunity: Repeat Clients Detected
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {repeatClientSuggestions[0].customer.name}
                </span>{' '}
                has ordered {repeatClientSuggestions[0].count} times. Convert to an automated monthly retainer?
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              handleOpenAddModal({
                clientPartyId: repeatClientSuggestions[0].customer.id,
                clientName: repeatClientSuggestions[0].customer.name,
                clientPhone: repeatClientSuggestions[0].customer.phone,
                clientEmail: repeatClientSuggestions[0].customer.email,
                frequency: 'monthly',
              })
            }
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors"
          >
            Create Subscription
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client or subscription..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg border ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            All ({subscriptions.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg border ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Active ({subscriptions.filter((s) => s.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1.5 rounded-lg border ${
              statusFilter === 'paused'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Paused ({subscriptions.filter((s) => s.status === 'paused').length})
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Client / Customer</th>
                <th className="p-3.5">Frequency</th>
                <th className="p-3.5">Service / Product Items</th>
                <th className="p-3.5">Next Billing Date</th>
                <th className="p-3.5 text-right">Amount / Cycle</th>
                <th className="p-3.5 text-center">Billed Count</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((sub) => {
                const isDue = sub.status === 'active' && sub.nextBillingDate && sub.nextBillingDate <= todayStr;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{sub.clientName}</p>
                        {sub.clientPhone && (
                          <p className="text-[11px] text-slate-400 font-mono">{sub.clientPhone}</p>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {sub.frequency}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-xs">
                        {sub.items.map((i) => i.name).join(', ')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Terms: {sub.paymentTermsDays || 15} Days Net
                      </p>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-semibold ${
                            isDue ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {formatDate(sub.nextBillingDate)}
                        </span>
                        {isDue && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Due Now
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                      {formatCurrency(sub.grandTotal)}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                      {sub.generatedCount || 0} bills
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleGenerateInvoiceNow(sub)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                          title="Generate and view invoice now"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Generate</span>
                        </button>

                        <button
                          onClick={() =>
                            updateSubscription(sub.id, {
                              status: sub.status === 'active' ? 'paused' : 'active',
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={sub.status === 'active' ? 'Pause Subscription' : 'Resume Subscription'}
                        >
                          {sub.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Cancel recurring schedule for ${sub.clientName}?`)) {
                              deleteSubscription(sub.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Subscription Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-600" />
                {editingSub ? 'Edit Recurring Schedule' : 'Create Recurring Invoice Schedule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Client Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Client *
                  </label>
                  <select
                    value={clientPartyId}
                    onChange={(e) => handlePartySelect(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Existing Client --</option>
                    {parties
                      .filter((p) => p.type === 'customer')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Company or client name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Recurrence Frequency & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Billing Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold capitalize"
                  >
                    <option value="weekly">Weekly (Every 7 days)</option>
                    <option value="monthly">Monthly (Every month)</option>
                    <option value="quarterly">Quarterly (Every 3 months)</option>
                    <option value="yearly">Yearly (Annual)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    First / Next Billing Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 15)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white text-xs">
                    Subscription Services / Items ({lineItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Service Row
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 w-16 text-center">Qty</th>
                        <th className="p-2.5 w-24 text-right">Price (₹)</th>
                        <th className="p-2.5 w-20 text-center">GST %</th>
                        <th className="p-2.5 w-24 text-right">Total</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              placeholder="Service or retainer name"
                              onChange={(e) => handleUpdateLine(item.id, { name: e.target.value })}
                              className="w-full p-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateLine(item.id, { quantity: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full p-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateLine(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full p-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-right font-mono font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.taxRate}
                              onChange={(e) =>
                                handleUpdateLine(item.id, { taxRate: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full p-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-semibold"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.id)}
                              disabled={lineItems.length === 1}
                              className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block">Subtotal: {formatCurrency(subtotal)}</span>
                  <span className="text-slate-500 block">GST Tax: {formatCurrency(taxTotal)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Total Per Cycle:</span>
                  <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Contract Notes / Billing Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scope of monthly retainer, SLA terms, auto-renewed contract"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  {editingSub ? 'Update Schedule' : 'Activate Recurring Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
