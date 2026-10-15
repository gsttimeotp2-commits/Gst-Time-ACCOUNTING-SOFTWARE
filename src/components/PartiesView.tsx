import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Share2,
  X,
  Eye,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { Party, Transaction, PaymentRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PartiesViewProps {
  onOpenCreateInvoiceForParty?: (party: Party) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({ onOpenCreateInvoiceForParty }) => {
  const { parties, transactions, payments, addParty, updateParty, deleteParty, addPayment } =
    useBilling();

  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [search, setSearch] = useState<string>('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'due' | 'settled'>('all');

  // Add / Edit Party Modal state
  const [showPartyModal, setShowPartyModal] = useState<boolean>(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [state, setState] = useState<string>('Maharashtra');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Party Ledger / Statement Modal state
  const [statementParty, setStatementParty] = useState<Party | null>(null);

  // Quick Record Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const openAddModal = () => {
    setEditingParty(null);
    setName('');
    setPhone('');
    setEmail('');
    setGstin('');
    setBillingAddress('');
    setState('Maharashtra');
    setOpeningBalance(0);
    setShowPartyModal(true);
  };

  const openEditModal = (p: Party) => {
    setEditingParty(p);
    setName(p.name);
    setPhone(p.phone);
    setEmail(p.email || '');
    setGstin(p.gstin || '');
    setBillingAddress(p.billingAddress || '');
    setState(p.state || 'Maharashtra');
    setOpeningBalance(p.openingBalance || 0);
    setShowPartyModal(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingParty) {
      await updateParty(editingParty.id, {
        name,
        phone,
        email,
        gstin,
        billingAddress,
        state,
        openingBalance,
      });
    } else {
      await addParty({
        type: activeTab,
        name,
        phone,
        email,
        gstin,
        billingAddress,
        state,
        openingBalance,
        currentBalance: openingBalance,
      });
    }
    setShowPartyModal(false);
  };

  // Record Quick Payment In / Out
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementParty || paymentAmount <= 0) return;

    await addPayment({
      type: statementParty.type === 'customer' ? 'in' : 'out',
      partyId: statementParty.id,
      partyName: statementParty.name,
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMode,
      notes: paymentNotes || `Direct settlement for ${statementParty.name}`,
    });

    setShowPaymentModal(false);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  const filteredParties = parties.filter((p) => {
    if (p.type !== activeTab) return false;

    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search)) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));

    if (filterBalance === 'due') {
      return matchesSearch && p.currentBalance > 0;
    }
    if (filterBalance === 'settled') {
      return matchesSearch && p.currentBalance <= 0;
    }
    return matchesSearch;
  });

  const totalOutstanding = parties
    .filter((p) => p.type === activeTab && p.currentBalance > 0)
    .reduce((acc, curr) => acc + curr.currentBalance, 0);

  // Statement transactions for the selected party
  const partyTransactions = statementParty
    ? transactions.filter((t) => t.partyId === statementParty.id || t.partyName === statementParty.name)
    : [];

  const partyPayments = statementParty
    ? payments.filter((p) => p.partyId === statementParty.id || p.partyName === statementParty.name)
    : [];

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Customer &amp; Supplier Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage contact details, GSTIN records, ledger balances, and payment settlements.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'customer' ? 'Customer' : 'Supplier'}
        </button>
      </div>

      {/* Tabs and Outstanding Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'customer'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Customers ({parties.filter((p) => p.type === 'customer').length})
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'supplier'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Suppliers ({parties.filter((p) => p.type === 'supplier').length})
          </button>
        </div>

        <div className="sm:col-span-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {activeTab === 'customer' ? 'Total Outstanding to Receive' : 'Total Outstanding to Pay'}
            </span>
            <span
              className={`text-lg sm:text-xl font-black font-mono ${
                activeTab === 'customer'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterBalance('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterBalance === 'all'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBalance('due')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterBalance === 'due'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold'
                  : 'text-slate-500'
              }`}
            >
              Has Balance Due
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab === 'customer' ? 'customers' : 'suppliers'} by name, phone, GSTIN...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Party Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.map((p) => {
          const hasDue = p.currentBalance > 0;
          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-400/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{p.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      hasDue
                        ? activeTab === 'customer'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {hasDue
                      ? activeTab === 'customer'
                        ? 'To Receive'
                        : 'To Pay'
                      : 'Settled'}
                  </span>
                </div>

                {p.gstin && (
                  <p className="text-xs font-mono font-semibold text-slate-500 mt-1">
                    GSTIN: {p.gstin}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {p.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {p.phone}
                    </p>
                  )}
                  {p.billingAddress && (
                    <p className="flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {p.billingAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* Balance & Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Current Balance</span>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {formatCurrency(p.currentBalance)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStatementParty(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs"
                    title="View Ledger Statement"
                  >
                    Ledger
                  </button>
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingParty ? 'Edit Party' : `Add New ${activeTab === 'customer' ? 'Customer' : 'Supplier'}`}
              </h3>
              <button onClick={() => setShowPartyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Business / Contact Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Hardware or Apex Infotech"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="27AAACS1429B1Z2"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 uppercase font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="billing@customer.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Shop / Office address, Street, City"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  {editingParty ? 'Update Party' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Party Ledger Statement Modal */}
      {statementParty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Ledger Statement: {statementParty.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {statementParty.phone} • {statementParty.gstin || 'Unregistered'}
                </p>
              </div>
              <button onClick={() => setStatementParty(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Bar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Current Balance Outstanding</span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {formatCurrency(statementParty.currentBalance)}
                </span>
              </div>
              <button
                onClick={() => {
                  setPaymentAmount(statementParty.currentBalance);
                  setShowPaymentModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Record {statementParty.type === 'customer' ? 'Payment In' : 'Payment Out'}
              </button>
            </div>

            {/* Statement Table */}
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                Transaction History ({partyTransactions.length} Invoices / Bills)
              </h4>
              {partyTransactions.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No transactions recorded yet.</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partyTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="p-2.5 text-slate-500">{formatDate(tx.date)}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-white">
                            {tx.invoiceNumber}
                          </td>
                          <td className="p-2.5 uppercase text-[10px]">{tx.type}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(tx.grandTotal)}</td>
                          <td className="p-2.5 text-right font-mono text-emerald-600">{formatCurrency(tx.paidAmount)}</td>
                          <td className="p-2.5 text-right font-mono text-rose-600">{formatCurrency(tx.balanceAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments Section */}
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mt-4 mb-2">
                Settlement Receipts &amp; Vouchers ({partyPayments.length})
              </h4>
              {partyPayments.length === 0 ? (
                <p className="text-slate-400 py-2 text-center text-[11px]">No direct receipts recorded.</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Mode</th>
                        <th className="p-2.5">Reference / Notes</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {partyPayments.map((pay) => (
                        <tr key={pay.id}>
                          <td className="p-2.5 text-slate-500">{formatDate(pay.date)}</td>
                          <td className="p-2.5 font-medium">{pay.paymentMode}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{pay.notes || '-'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(pay.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setStatementParty(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-white"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && statementParty && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Record Payment: {statementParty.name}
            </h4>
            <p className="text-xs text-slate-500">
              Current balance: <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(statementParty.currentBalance)}</span>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notes / Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque #981290"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-bold"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
