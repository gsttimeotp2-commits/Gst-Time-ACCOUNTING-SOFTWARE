import React, { useState } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  Sparkles,
  Edit2,
  Trash2,
  SlidersHorizontal,
  X,
  Loader2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Download,
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { Item } from '../types';
import { formatCurrency } from '../utils/formatters';
import { exportInventoryReport } from '../utils/csvExport';

export const InventoryView: React.FC = () => {
  const { items, addItem, updateItem, deleteItem, adjustStock } = useBilling();

  const [search, setSearch] = useState<string>('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Add / Edit Product Modal state
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [hsn, setHsn] = useState<string>('');
  const [unit, setUnit] = useState<string>('Pcs');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [category, setCategory] = useState<string>('General');
  const [description, setDescription] = useState<string>('');

  // AI Product Generator state
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSuccessNote, setAiSuccessNote] = useState<string | null>(null);

  // Stock Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Count Verification');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setHsn('');
    setUnit('Pcs');
    setSalePrice(0);
    setPurchasePrice(0);
    setStock(10);
    setMinStockAlert(5);
    setTaxRate(18);
    setCategory('General');
    setDescription('');
    setAiSuccessNote(null);
    setShowProductModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku || '');
    setHsn(item.hsn || '');
    setUnit(item.unit || 'Pcs');
    setSalePrice(item.salePrice);
    setPurchasePrice(item.purchasePrice);
    setStock(item.stock);
    setMinStockAlert(item.minStockAlert);
    setTaxRate(item.taxRate);
    setCategory(item.category || 'General');
    setDescription(item.description || '');
    setAiSuccessNote(null);
    setShowProductModal(true);
  };

  // AI Generator feature
  const handleAIGenerateDetails = async () => {
    if (!name.trim()) {
      alert('Please enter a product name first so Gemini can research its HSN & description.');
      return;
    }
    setIsGeneratingAI(true);
    setAiSuccessNote(null);
    try {
      const res = await fetch('/api/ai/product-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: name, category }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate details');
      }

      const d = json.data;
      if (d.suggestedHsn) setHsn(d.suggestedHsn);
      if (d.suggestedTaxRate !== undefined) setTaxRate(d.suggestedTaxRate);
      if (d.unit) setUnit(d.unit);
      if (d.description) setDescription(d.description);
      if (d.category) setCategory(d.category);

      setAiSuccessNote(`Gemini identified HSN ${d.suggestedHsn} and suggested ${d.suggestedTaxRate}% GST!`);
    } catch (err: any) {
      alert(err?.message || 'AI generation failed');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      await updateItem(editingItem.id, {
        name,
        sku,
        hsn,
        unit,
        salePrice,
        purchasePrice,
        stock,
        minStockAlert,
        taxRate,
        category,
        description,
      });
    } else {
      await addItem({
        name,
        sku,
        hsn,
        unit,
        salePrice,
        purchasePrice,
        stock,
        minStockAlert,
        taxRate,
        category,
        description,
      });
    }
    setShowProductModal(false);
  };

  const handleExecuteStockAdjustment = async () => {
    if (!adjustingItem) return;
    const newStock = Math.max(0, adjustingItem.stock + adjustAmount);
    await adjustStock(adjustingItem.id, newStock, adjustReason);
    setShowAdjustModal(false);
  };

  const filteredItems = items.filter((it) => {
    const matchSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku && it.sku.toLowerCase().includes(search.toLowerCase())) ||
      (it.hsn && it.hsn.toLowerCase().includes(search.toLowerCase()));

    const matchLowStock = filterLowStockOnly ? it.stock <= it.minStockAlert : true;
    return matchSearch && matchLowStock;
  });

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Inventory &amp; Stock Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track stock levels, HSN codes, GST tax rates, and AI-assisted restock alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export Options: Excel & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              onClick={() => exportInventoryReport(filteredItems, 'xlsx')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all"
              title="Export stock and valuation to Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            <span className="w-px h-4 bg-slate-200 dark:border-slate-700" />
            <button
              onClick={() => exportInventoryReport(filteredItems, 'csv')}
              className="px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm transition-all"
              title="Export stock and valuation to CSV (.csv)"
            >
              CSV
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filterLowStockOnly
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Low Stock Alerts Only ({items.filter((i) => i.stock <= i.minStockAlert).length})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Product Details</th>
                <th className="p-3.5">HSN Code</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Sale Price</th>
                <th className="p-3.5 text-right">Purchase Price</th>
                <th className="p-3.5 text-center">GST Rate</th>
                <th className="p-3.5 text-center">Current Stock</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const isLow = item.stock <= item.minStockAlert;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</p>
                        {item.sku && (
                          <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {item.hsn || '-'}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category || 'General'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.salePrice)}
                    </td>

                    <td className="p-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.purchasePrice)}
                    </td>

                    <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                      {item.taxRate}%
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.stock} {item.unit}
                        </span>
                        {isLow && (
                          <span
                            className="p-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                            title={`Low stock! Min alert threshold is ${item.minStockAlert}`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setAdjustingItem(item);
                            setAdjustAmount(0);
                            setShowAdjustModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          title="Adjust stock quantity"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete item "${item.name}"?`)) deleteItem(item.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete Product"
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

      {/* Add / Edit Product Modal with AI Generator */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingItem ? 'Edit Product' : 'Add New Inventory Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs sm:text-sm">
              {/* Product Name & AI Generator Trigger */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Product / Item Name *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraTech Super Cement 50Kg or Logitech MX Master 3S"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 text-slate-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAIGenerateDetails}
                    disabled={isGeneratingAI || !name.trim()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    title="Auto-generate HSN, tax rate, and marketing description with Gemini AI"
                  >
                    {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>AI Autofill</span>
                  </button>
                </div>
              </div>

              {aiSuccessNote && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{aiSuccessNote}</span>
                </div>
              )}

              {/* Grid 1: SKU, HSN, Category, Unit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">HSN / SAC</label>
                  <input
                    type="text"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    placeholder="8471"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Pcs, Kg, Box"
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-center"
                  />
                </div>
              </div>

              {/* Grid 2: Pricing & Tax */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">GST Tax Slab</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Essential)</option>
                    <option value="12">12% (Standard I)</option>
                    <option value="18">18% (Standard II)</option>
                    <option value="28">28% (Luxury)</option>
                  </select>
                </div>
              </div>

              {/* Grid 3: Stock counts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Min Stock Reorder Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key product highlights or specifications"
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  {editingItem ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Adjust Stock: {adjustingItem.name}
            </h4>
            <p className="text-xs text-slate-500">
              Current recorded stock: <span className="font-bold text-slate-800 dark:text-white">{adjustingItem.stock} {adjustingItem.unit}</span>
            </p>

            <div>
              <label className="text-xs font-semibold block mb-1">Add / Subtract Quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  placeholder="+5 or -3"
                  className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                New resulting stock:{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.max(0, adjustingItem.stock + adjustAmount)} {adjustingItem.unit}
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Reason for Adjustment</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              >
                <option value="Physical Count Verification">Physical Count Verification</option>
                <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                <option value="Internal Company Usage">Internal Company Usage</option>
                <option value="Supplier Sample Receipt">Supplier Sample Receipt</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteStockAdjustment}
                className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-bold"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
