import React from 'react';
import { Menu, Plus, Mic, Cloud, Search, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenVoiceBilling: () => void;
  onCreateInvoice: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenVoiceBilling,
  onCreateInvoice,
  searchQuery,
  setSearchQuery,
}) => {
  const { profile, role, user } = useAuth();
  const { loading } = useBilling();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
      {/* Left: Mobile hamburger & Business identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {profile?.businessName || 'BillPulse AI Business'}
              </h1>
              {profile?.gstin && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  GST: {profile.gstin}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="capitalize flex items-center gap-1 text-[11px]">
                <Shield className="w-3 h-3 text-indigo-500" />
                {role} Mode
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Cloud
                  className={`w-3 h-3 ${
                    loading ? 'text-amber-500 animate-spin' : user ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                />
                {user ? 'Firestore Cloud Synced' : 'Local Sandbox Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Quick search bar */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices, customers, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Voice Billing Button */}
        <button
          onClick={onOpenVoiceBilling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-indigo-300 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          title="Create invoice by voice or natural prompt"
        >
          <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span className="hidden sm:inline">AI Voice Billing</span>
          <span className="sm:hidden">Voice</span>
        </button>

        {/* Primary Invoice Creation CTA */}
        <button
          onClick={onCreateInvoice}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Invoice</span>
          <span className="sm:hidden">Invoice</span>
        </button>
      </div>
    </header>
  );
};
