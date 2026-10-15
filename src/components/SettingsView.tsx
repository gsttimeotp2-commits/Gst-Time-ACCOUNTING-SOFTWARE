import React, { useState } from 'react';
import {
  Settings,
  Building2,
  CreditCard,
  QrCode,
  FileText,
  ShieldCheck,
  Save,
  Cloud,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import { UserRole } from '../types';

export const SettingsView: React.FC = () => {
  const { profile, updateProfile, role, setRole, user, signIn, signOut } = useAuth();
  const { seedInitialDataToFirestore } = useBilling();

  const [businessName, setBusinessName] = useState<string>(profile?.businessName || '');
  const [ownerName, setOwnerName] = useState<string>(profile?.ownerName || '');
  const [email, setEmail] = useState<string>(profile?.email || '');
  const [phone, setPhone] = useState<string>(profile?.phone || '');
  const [gstin, setGstin] = useState<string>(profile?.gstin || '');
  const [address, setAddress] = useState<string>(profile?.address || '');
  const [state, setState] = useState<string>(profile?.state || 'Maharashtra');

  // Bank & UPI
  const [bankName, setBankName] = useState<string>(profile?.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(profile?.accountNumber || '');
  const [ifsc, setIfsc] = useState<string>(profile?.ifsc || '');
  const [upiId, setUpiId] = useState<string>(profile?.upiId || '');

  // Invoice terms & template
  const [invoiceTerms, setInvoiceTerms] = useState<string>(profile?.invoiceTerms || '');
  const [defaultTemplate, setDefaultTemplate] = useState<'modern' | 'classic' | 'compact'>(
    profile?.defaultTemplate || 'modern'
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Cloud seed status
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccess, setSeedSuccess] = useState<boolean>(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    await updateProfile({
      businessName,
      ownerName,
      email,
      phone,
      gstin,
      address,
      state,
      bankName,
      accountNumber,
      ifsc,
      upiId,
      invoiceTerms,
      defaultTemplate,
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSeedCloudData = async () => {
    if (!user) {
      alert('Please sign in with Google first to seed data directly to your Firestore project.');
      return;
    }
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      await seedInitialDataToFirestore();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err: any) {
      alert('Error seeding data: ' + err?.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const upiQrPreview = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `upi://pay?pa=${upiId || 'business@upi'}&pn=${encodeURIComponent(businessName || 'Business')}&cu=INR`
  )}`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Business Profile &amp; Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Configure GSTIN credentials, bank accounts, UPI QR payments, and role-based access.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Business settings and bank details updated successfully!</span>
        </div>
      )}

      {/* Cloud Firestore & Google Account Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Firebase Cloud Firestore Sync
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-600'}`}>
                {user ? 'Connected' : 'Offline / Demo Sandbox'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {user
                ? `Logged in as ${user.email} (Project: impressive-observer-l8f9p)`
                : 'Sign in with your Google account to sync invoices and customers across devices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                type="button"
                onClick={handleSeedCloudData}
                disabled={isSeeding}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                title="Populates your Firestore cloud database with demo catalog and invoices"
              >
                {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                <span>{seedSuccess ? 'Cloud Seeded!' : 'Seed Demo Data to Firestore'}</span>
              </button>
              <button
                type="button"
                onClick={signOut}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={signIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Access Control Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Permissions &amp; Access Control</span>
        </div>
        <p className="text-xs text-slate-500">
          Current active session role: <span className="font-bold capitalize text-slate-800 dark:text-white">{role}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div
            onClick={() => setRole('owner')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              role === 'owner'
                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Owner / Admin</span>
              {role === 'owner' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500">
              Full access to invoices, bank settings, profits, delete records &amp; configurations.
            </p>
          </div>

          <div
            onClick={() => setRole('cashier')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              role === 'cashier'
                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Cashier / Billing Staff</span>
              {role === 'cashier' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500">
              Create sales invoices, search products, print receipts, and record customer payments.
            </p>
          </div>

          <div
            onClick={() => setRole('accountant')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              role === 'accountant'
                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Accountant / Auditor</span>
              {role === 'accountant' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500">
              View GSTR-1 &amp; GSTR-3B filings, audit P&amp;L ledgers, and download financial statements.
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Business Identity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            Company &amp; GSTIN Registration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Owner / Authorized Person
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                GSTIN Number (15 Digits)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AAABCU9603R1ZM"
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 uppercase font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                State / Jurisdiction
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Billing Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Registered Business Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 resize-none text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank Details & UPI QR Code */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Bank Account &amp; UPI QR Code Setup
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm">
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="HDFC0001245"
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 uppercase font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  UPI ID (VPA) for Invoices
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="vortexinfo@hdfcbank"
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-medium"
                />
              </div>
            </div>

            {/* Live QR Code Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
              <img
                src={upiQrPreview}
                alt="UPI QR Code"
                className="w-24 h-24 rounded-lg bg-white p-1 border border-slate-200 shadow-xs mb-2"
              />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Live UPI QR Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{upiId || 'No UPI ID set'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Invoice Terms & Default Template */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            Invoice Terms &amp; Visual Templates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Standard Invoice Terms &amp; Conditions
              </label>
              <textarea
                rows={3}
                value={invoiceTerms}
                onChange={(e) => setInvoiceTerms(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Default Invoice Template
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['modern', 'classic', 'compact'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDefaultTemplate(t)}
                    className={`py-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      defaultTemplate === t
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Business Settings
          </button>
        </div>
      </form>
    </div>
  );
};
