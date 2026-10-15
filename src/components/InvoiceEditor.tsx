import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Printer,
  Sparkles,
  Building2,
  Calendar,
  FileCheck,
  CreditCard,
  Percent,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import { Transaction, InvoiceLineItem, TransactionType, Party } from '../types';
import { formatCurrency, calculateTax } from '../utils/formatters';

interface InvoiceEditorProps {
  initialType?: TransactionType;
  initialData?: Partial<Transaction> | null;
  onClose: () => void;
  onSaveSuccess: (savedTxn: Transaction) => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialType = 'sale',
  initialData,
  onClose,
  onSaveSuccess,
}) => {
  const { profile } = useAuth();
  const { parties, items, addTransaction, addParty } = useBilling();

  const [type, setType] = useState<TransactionType>(initialData?.type || initialType);
  const [isGSTInvoice, setIsGSTInvoice] = useState<boolean>(initialData?.isGSTInvoice ?? true);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    initialData?.invoiceNumber ||
      `${type === 'sale' ? 'INV' : type === 'purchase' ? 'PUR' : 'RET'}-${new Date().getFullYear()}-${Math.floor(
        100 + Math.random() * 900
      )}`
  );
  const [date, setDate] = useState<string>(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    initialData?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );

  // Party details
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialData?.partyId || '');
  const [partyName, setPartyName] = useState<string>(initialData?.partyName || '');
  const [partyPhone, setPartyPhone] = useState<string>(initialData?.partyPhone || '');
  const [partyGstin, setPartyGstin] = useState<string>(initialData?.partyGstin || '');
  const [partyAddress, setPartyAddress] = useState<string>(initialData?.partyAddress || '');
  const [isInterState, setIsInterState] = useState<boolean>(initialData?.isInterState || false);

  // Inline Add Customer/Supplier Modal
  const [showAddPartyModal, setShowAddPartyModal] = useState<boolean>(false);
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [newPartyGstin, setNewPartyGstin] = useState<string>('');

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items;
    }
    return [
      {
        id: `li_${Date.now()}_1`,
        name: '',
        hsn: '',
        unit: 'Pcs',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        total: 0,
      },
    ];
  });

  // Overall Discount & Payment
  const [overallDiscount, setOverallDiscount] = useState<number>(initialData?.discount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(initialData?.paidAmount ?? 0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit'>(
    (initialData?.paymentMode as any) || 'UPI'
  );
  const [notes, setNotes] = useState<string>(
    initialData?.notes || profile?.invoiceTerms || 'Thank you for your business!'
  );
  const [template, setTemplate] = useState<'modern' | 'classic' | 'compact'>(
    initialData?.template || profile?.defaultTemplate || 'modern'
  );

  // Sync party info when selecting from dropdown
  const handleSelectParty = (pId: string) => {
    setSelectedPartyId(pId);
    const found = parties.find((p) => p.id === pId);
    if (found) {
      setPartyName(found.name);
      setPartyPhone(found.phone || '');
      setPartyGstin(found.gstin || '');
      setPartyAddress(found.billingAddress || '');

      // Check interstate logic: if party state is different from business profile state
      if (found.state && profile?.state && found.state.toLowerCase() !== profile.state.toLowerCase()) {
        setIsInterState(true);
      } else {
        setIsInterState(false);
      }
    }
  };

  // Quick Add Party
  const handleCreateQuickParty = async () => {
    if (!newPartyName.trim()) return;
    const pType = type === 'purchase' || type === 'purchase_return' ? 'supplier' : 'customer';
    const created = await addParty({
      type: pType,
      name: newPartyName,
      phone: newPartyPhone,
      gstin: newPartyGstin,
      openingBalance: 0,
      currentBalance: 0,
    });
    handleSelectParty(created.id);
    setShowAddPartyModal(false);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
  };

  // Line items modification
  const handleUpdateLine = (id: string, updates: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const merged = { ...item, ...updates };

        // If selecting from an existing inventory item
        if (updates.itemId) {
          const matchedItem = items.find((it) => it.id === updates.itemId);
          if (matchedItem) {
            merged.name = matchedItem.name;
            merged.hsn = matchedItem.hsn || '';
            merged.unit = matchedItem.unit || 'Pcs';
            merged.unitPrice =
              type === 'purchase' || type === 'purchase_return'
                ? matchedItem.purchasePrice
                : matchedItem.salePrice;
            merged.taxRate = matchedItem.taxRate;
          }
        }

        const qty = Number(merged.quantity) || 0;
        const price = Number(merged.unitPrice) || 0;
        const disc = Number(merged.discount) || 0;
        const rate = isGSTInvoice ? Number(merged.taxRate) || 0 : 0;

        const basicTotal = Math.max(0, qty * price - disc);
        const taxVal = (basicTotal * rate) / 100;
        const finalTotal = basicTotal + taxVal;

        merged.taxAmount = taxVal;
        merged.total = finalTotal;

        return merged;
      })
    );
  };

  const handleAddLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `li_${Date.now()}_${prev.length + 1}`,
        name: '',
        hsn: '',
        unit: 'Pcs',
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

  // Totals Calculation
  const subtotal = lineItems.reduce((acc, curr) => {
    const basic = Math.max(0, (curr.quantity || 0) * (curr.unitPrice || 0) - (curr.discount || 0));
    return acc + basic;
  }, 0);

  const taxableAmountAfterOverallDiscount = Math.max(0, subtotal - overallDiscount);

  // Calculate GST splits
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;

  if (isGSTInvoice) {
    lineItems.forEach((li) => {
      const basic = Math.max(0, (li.quantity || 0) * (li.unitPrice || 0) - (li.discount || 0));
      // Pro-rata overall discount deduction if any
      const effectiveBasic = subtotal > 0 ? basic * (taxableAmountAfterOverallDiscount / subtotal) : basic;
      const { cgst, sgst, igst, totalTax } = calculateTax(effectiveBasic, li.taxRate || 0, isInterState);
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      taxTotal += totalTax;
    });
  }

  const grandTotal = Math.round(taxableAmountAfterOverallDiscount + taxTotal);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  // Set paid amount = grand total by default if payment mode is full cash/UPI and user hasn't typed
  const handleQuickPayFull = () => {
    setPaidAmount(grandTotal);
  };

  const handleSaveInvoice = async () => {
    if (!partyName.trim()) {
      alert('Please provide or select a Customer / Party name');
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].name.trim()) {
      alert('Please add at least one line item with a name and price.');
      return;
    }

    const paymentStatus: 'paid' | 'partial' | 'unpaid' =
      paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const newTxn = await addTransaction({
      type,
      invoiceNumber,
      date,
      dueDate,
      partyId: selectedPartyId || undefined,
      partyName,
      partyPhone,
      partyGstin,
      partyAddress,
      isInterState,
      items: lineItems,
      subtotal,
      discount: overallDiscount,
      taxTotal,
      cgst: cgstTotal,
      sgst: sgstTotal,
      igst: igstTotal,
      grandTotal,
      paidAmount,
      balanceAmount,
      paymentMode,
      paymentStatus,
      notes,
      template,
      isGSTInvoice,
    });

    onSaveSuccess(newTxn);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
                  {type === 'sale'
                    ? isGSTInvoice
                      ? 'Tax Invoice (GST)'
                      : 'Retail Bill (Non-GST)'
                    : type === 'purchase'
                    ? 'Purchase Bill'
                    : type === 'sale_return'
                    ? 'Sale Return (Credit Note)'
                    : 'Purchase Return (Debit Note)'}
                </h2>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setIsGSTInvoice(true)}
                    className={`px-2 py-0.5 rounded font-semibold transition-all ${
                      isGSTInvoice ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    GST Bill
                  </button>
                  <button
                    onClick={() => setIsGSTInvoice(false)}
                    className={`px-2 py-0.5 rounded font-semibold transition-all ${
                      !isGSTInvoice ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Non-GST
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoice #{invoiceNumber} • Created on {date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Top Meta Grid: Party Selection, Invoice #, Date, Supply Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Party Selector */}
            <div className="md:col-span-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {type === 'purchase' || type === 'purchase_return' ? 'Supplier / Vendor' : 'Customer / Party'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  Add New
                </button>
              </div>

              <select
                value={selectedPartyId}
                onChange={(e) => handleSelectParty(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500"
              >
                <option value="">-- Choose Existing Party --</option>
                {parties
                  .filter((p) =>
                    type === 'purchase' || type === 'purchase_return'
                      ? p.type === 'supplier'
                      : p.type === 'customer'
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
              </select>

              <input
                type="text"
                placeholder="Or type Party / Customer Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Phone No."
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="GSTIN (Optional)"
                  value={partyGstin}
                  onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono text-xs"
                />
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Invoice Numbers & Dates</label>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Invoice #</span>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Due Date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* GST Place of Supply & Template */}
            <div className="space-y-3">
              <label className="font-semibold text-slate-700 dark:text-slate-300">GST Place of Supply</label>

              {isGSTInvoice && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Interstate Sale (IGST)?</span>
                    <input
                      type="checkbox"
                      checked={isInterState}
                      onChange={(e) => setIsInterState(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isInterState
                      ? '⚡ Inter-State: 18% IGST applies'
                      : '🏢 Intra-State: 9% CGST + 9% SGST applies'}
                  </p>
                </div>
              )}

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Invoice Template</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['modern', 'classic', 'compact'] as const).map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setTemplate(tmpl)}
                      className={`py-1.5 text-xs font-medium rounded-lg border capitalize transition-all ${
                        template === tmpl
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Items & Services ({lineItems.length})
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 w-8">#</th>
                    <th className="p-3">Item Name / Description</th>
                    {isGSTInvoice && <th className="p-3 w-24">HSN/SAC</th>}
                    <th className="p-3 w-20">Qty</th>
                    <th className="p-3 w-20">Unit</th>
                    <th className="p-3 w-28">Price (₹)</th>
                    <th className="p-3 w-20">Disc (₹)</th>
                    {isGSTInvoice && <th className="p-3 w-24">GST %</th>}
                    <th className="p-3 w-28 text-right">Total (₹)</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 font-mono text-center">{index + 1}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {/* Pick from existing inventory or type */}
                          <select
                            onChange={(e) => handleUpdateLine(item.id, { itemId: e.target.value })}
                            className="w-full p-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs mb-1"
                          >
                            <option value="">-- Choose from Inventory Stock --</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} (Stock: {it.stock} {it.unit} • ₹{it.salePrice})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Item name / specification"
                            value={item.name}
                            onChange={(e) => handleUpdateLine(item.id, { name: e.target.value })}
                            className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                          />
                        </div>
                      </td>

                      {isGSTInvoice && (
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="HSN"
                            value={item.hsn || ''}
                            onChange={(e) => handleUpdateLine(item.id, { hsn: e.target.value })}
                            className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                          />
                        </td>
                      )}

                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLine(item.id, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateLine(item.id, { unit: e.target.value })}
                          className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateLine(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(e) =>
                            handleUpdateLine(item.id, { discount: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </td>

                      {isGSTInvoice && (
                        <td className="p-3">
                          <select
                            value={item.taxRate}
                            onChange={(e) =>
                              handleUpdateLine(item.id, { taxRate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                      )}

                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(item.total)}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(item.id)}
                          disabled={lineItems.length === 1}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30"
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

          {/* Bottom Grid: Payment & Summary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Payment & Terms Section */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                Payment Settlement & Terms
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Payment Mode</span>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit">Credit / Unpaid</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Paid Amount (₹)</span>
                    <button
                      type="button"
                      onClick={handleQuickPayFull}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Pay Full
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Notes & Terms</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms & Conditions or Bank Instructions"
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs resize-none"
                />
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white">Invoice Calculations</h4>

              <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                <span>Subtotal (Taxable Value):</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                <span>Additional Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 p-1 rounded text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                />
              </div>

              {isGSTInvoice && (
                <>
                  {isInterState ? (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {formatCurrency(igstTotal)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                        <span>Central GST (CGST):</span>
                        <span className="font-mono">{formatCurrency(cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                        <span>State GST (SGST):</span>
                        <span className="font-mono">{formatCurrency(sgstTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
                    <span>Total GST Amount:</span>
                    <span className="font-mono font-semibold">{formatCurrency(taxTotal)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-2 border-t-2 border-slate-300 dark:border-slate-700">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Paid Amount: {formatCurrency(paidAmount)}
                </span>
                <span
                  className={`font-semibold ${
                    balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                  }`}
                >
                  Balance Due: {formatCurrency(balanceAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              Save &amp; View Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Party Modal */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Quick Add {type === 'purchase' ? 'Supplier' : 'Customer'}
            </h4>
            <input
              type="text"
              placeholder="Name *"
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={newPartyPhone}
              onChange={(e) => setNewPartyPhone(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <input
              type="text"
              placeholder="GSTIN (optional)"
              value={newPartyGstin}
              onChange={(e) => setNewPartyGstin(e.target.value.toUpperCase())}
              className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 uppercase font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPartyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateQuickParty}
                disabled={!newPartyName.trim()}
                className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Save Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
