import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Users,
  Package,
  Receipt,
  Wallet,
  BarChart3,
  Sparkles,
  Settings,
  Mic,
  ShieldCheck,
  Building2,
  CalendarClock,
  LogOut,
  LogIn,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'sales'
  | 'subscriptions'
  | 'purchases'
  | 'parties'
  | 'inventory'
  | 'expenses'
  | 'payments'
  | 'reports'
  | 'ai-insights'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenVoiceBilling: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenVoiceBilling,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, profile, role, setRole, signIn, signOut } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales & Invoices', icon: FileText },
    { id: 'subscriptions', label: 'Recurring & Subscriptions', icon: CalendarClock },
    { id: 'purchases', label: 'Purchases & Bills', icon: ShoppingBag },
    { id: 'parties', label: 'Customers & Suppliers', icon: Users },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'payments', label: 'Payments & Ledger', icon: Wallet },
    { id: 'reports', label: 'GST & P&L Reports', icon: BarChart3 },
    { id: 'ai-insights', label: 'AI Business Advisor', icon: Sparkles },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 text-slate-200 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">BillPulse</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[140px]">
                {profile?.businessName || 'Business ERP'}
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Voice Billing Floating Trigger */}
        <div className="p-3">
          <button
            onClick={() => {
              onOpenVoiceBilling();
              onCloseMobile();
            }}
            className="w-full relative overflow-hidden group p-3 rounded-xl bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 transition-all shadow-md text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Mic className="w-4 h-4 text-indigo-300 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">AI Voice Billing</p>
                <p className="text-[10px] text-indigo-200/80">Speak or text to bill</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-300 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Role-Based Access Control Switcher */}
        <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5 text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Active Role
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Access</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['owner', 'cashier', 'accountant'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-1 text-[11px] font-medium rounded capitalize transition-colors ${
                  role === r
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Switch view to ${r} mode`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* User Profile & Auth Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-white truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                title="Sign out of Firebase"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
