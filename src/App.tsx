import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BillingProvider, useBilling } from './context/BillingContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TransactionsListView } from './components/TransactionsListView';
import { PartiesView } from './components/PartiesView';
import { InventoryView } from './components/InventoryView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { AIInsightsView } from './components/AIInsightsView';
import { SettingsView } from './components/SettingsView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AIVoiceBillingModal } from './components/AIVoiceBillingModal';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceViewerModal } from './components/InvoiceViewerModal';
import { Transaction, TransactionType } from './types';

const MainLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Voice Billing Modal
  const [isVoiceBillingOpen, setIsVoiceBillingOpen] = useState<boolean>(false);

  // Invoice Editor Modal
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState<boolean>(false);
  const [editorType, setEditorType] = useState<TransactionType>('sale');
  const [editorInitialData, setEditorInitialData] = useState<Partial<Transaction> | null>(null);

  // Invoice Viewer Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // Trigger Create Invoice
  const handleOpenCreateInvoice = (type: TransactionType = 'sale') => {
    setEditorType(type);
    setEditorInitialData(null);
    setIsInvoiceEditorOpen(true);
  };

  // When AI Voice Billing extracts data
  const handleApplyVoiceInvoice = (parsedData: any) => {
    const formattedItems = parsedData.items?.map((it: any, index: number) => {
      const basic = (it.quantity || 1) * (it.unitPrice || 0);
      const taxAmount = (basic * (it.taxRate || 0)) / 100;
      return {
        id: `li_ai_${Date.now()}_${index}`,
        name: it.name || 'Item',
        hsn: it.hsn || '',
        unit: it.unit || 'Pcs',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discount: 0,
        taxRate: it.taxRate ?? 18,
        taxAmount,
        total: basic + taxAmount,
      };
    }) || [];

    setEditorType(parsedData.type || 'sale');
    setEditorInitialData({
      partyName: parsedData.partyName || '',
      partyPhone: parsedData.partyPhone || '',
      partyGstin: parsedData.partyGstin || '',
      type: parsedData.type || 'sale',
      isInterState: parsedData.isInterState || false,
      items: formattedItems,
      discount: parsedData.discount || 0,
      paidAmount: parsedData.paidAmount ?? 0,
      paymentMode: (parsedData.paymentMode as any) || 'UPI',
      notes: parsedData.notes || '',
    });
    setIsInvoiceEditorOpen(true);
  };

  // Open Viewer
  const handleSelectTransaction = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setIsViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenVoiceBilling={() => setIsVoiceBillingOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenVoiceBilling={() => setIsVoiceBillingOpen(true)}
          onCreateInvoice={() => handleOpenCreateInvoice('sale')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <Dashboard
              onOpenCreateInvoice={() => handleOpenCreateInvoice('sale')}
              onOpenVoiceBilling={() => setIsVoiceBillingOpen(true)}
              onSelectTransaction={handleSelectTransaction}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'sales' && (
            <TransactionsListView
              defaultType="sale"
              onOpenCreateInvoice={handleOpenCreateInvoice}
              onSelectTransaction={handleSelectTransaction}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView onViewGeneratedInvoice={handleSelectTransaction} />
          )}

          {currentTab === 'purchases' && (
            <TransactionsListView
              defaultType="purchase"
              onOpenCreateInvoice={handleOpenCreateInvoice}
              onSelectTransaction={handleSelectTransaction}
            />
          )}

          {currentTab === 'parties' && (
            <PartiesView
              onOpenCreateInvoiceForParty={(party) => {
                setEditorType(party.type === 'supplier' ? 'purchase' : 'sale');
                setEditorInitialData({
                  partyId: party.id,
                  partyName: party.name,
                  partyPhone: party.phone,
                  partyGstin: party.gstin,
                  partyAddress: party.billingAddress,
                });
                setIsInvoiceEditorOpen(true);
              }}
            />
          )}

          {currentTab === 'inventory' && <InventoryView />}

          {currentTab === 'expenses' && <ExpensesView />}

          {currentTab === 'payments' && (
            <PartiesView />
          )}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'ai-insights' && <AIInsightsView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals */}
      <AIVoiceBillingModal
        isOpen={isVoiceBillingOpen}
        onClose={() => setIsVoiceBillingOpen(false)}
        onApplyInvoice={handleApplyVoiceInvoice}
      />

      {isInvoiceEditorOpen && (
        <InvoiceEditor
          initialType={editorType}
          initialData={editorInitialData}
          onClose={() => setIsInvoiceEditorOpen(false)}
          onSaveSuccess={(savedTxn) => {
            setIsInvoiceEditorOpen(false);
            handleSelectTransaction(savedTxn);
          }}
        />
      )}

      <InvoiceViewerModal
        isOpen={isViewerOpen}
        transaction={selectedTransaction}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BillingProvider>
        <MainLayout />
      </BillingProvider>
    </AuthProvider>
  );
}
