import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { Party, Item, Transaction, Expense, PaymentRecord, BusinessMetrics, Subscription } from '../types';
import {
  SEED_PARTIES,
  SEED_ITEMS,
  SEED_TRANSACTIONS,
  SEED_EXPENSES,
  SEED_PAYMENTS,
  SEED_SUBSCRIPTIONS,
} from '../data/seedData';
import { computeNextBillingDate } from '../utils/formatters';

interface BillingContextType {
  parties: Party[];
  items: Item[];
  transactions: Transaction[];
  expenses: Expense[];
  payments: PaymentRecord[];
  subscriptions: Subscription[];
  metrics: BusinessMetrics;
  loading: boolean;
  addParty: (party: Omit<Party, 'id' | 'userId' | 'createdAt'>) => Promise<Party>;
  updateParty: (id: string, updates: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'userId' | 'createdAt'>) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  adjustStock: (itemId: string, newStock: number, reason?: string) => Promise<void>;
  addTransaction: (txn: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  addPayment: (payment: Omit<PaymentRecord, 'id' | 'userId' | 'createdAt'>) => Promise<PaymentRecord>;
  deletePayment: (id: string) => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'generatedCount'>) => Promise<Subscription>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  generateInvoiceFromSubscription: (subscriptionId: string) => Promise<Transaction>;
  bulkProcessDueSubscriptions: () => Promise<number>;
  seedInitialDataToFirestore: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fallback to local seed data for guests or before sync
  useEffect(() => {
    if (!user) {
      setParties(SEED_PARTIES.map((p) => ({ ...p, userId: 'demo_user' })));
      setItems(SEED_ITEMS.map((i) => ({ ...i, userId: 'demo_user' })));
      setTransactions(SEED_TRANSACTIONS.map((t) => ({ ...t, userId: 'demo_user' })));
      setExpenses(SEED_EXPENSES.map((e) => ({ ...e, userId: 'demo_user' })));
      setPayments(SEED_PAYMENTS.map((p) => ({ ...p, userId: 'demo_user' })));
      setSubscriptions(SEED_SUBSCRIPTIONS.map((s) => ({ ...s, userId: 'demo_user' })));
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = user.uid;

    const partiesPath = `users/${userId}/parties`;
    const unsubsParties = onSnapshot(
      collection(db, partiesPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Party));
          setParties(docs);
        } else {
          // If first time with empty cloud data, show seed data locally
          setParties(SEED_PARTIES.map((p) => ({ ...p, userId })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, partiesPath)
    );

    const itemsPath = `users/${userId}/items`;
    const unsubsItems = onSnapshot(
      collection(db, itemsPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
          setItems(docs);
        } else {
          setItems(SEED_ITEMS.map((i) => ({ ...i, userId })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, itemsPath)
    );

    const txnsPath = `users/${userId}/transactions`;
    const unsubsTxns = onSnapshot(
      collection(db, txnsPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
          setTransactions(docs);
        } else {
          setTransactions(SEED_TRANSACTIONS.map((t) => ({ ...t, userId })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, txnsPath)
    );

    const expensesPath = `users/${userId}/expenses`;
    const unsubsExpenses = onSnapshot(
      collection(db, expensesPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
          setExpenses(docs);
        } else {
          setExpenses(SEED_EXPENSES.map((e) => ({ ...e, userId })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, expensesPath)
    );

    const paymentsPath = `users/${userId}/payments`;
    const unsubsPayments = onSnapshot(
      collection(db, paymentsPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
          setPayments(docs);
        } else {
          setPayments(SEED_PAYMENTS.map((p) => ({ ...p, userId })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, paymentsPath)
    );

    const subsPath = `users/${userId}/subscriptions`;
    const unsubsSubs = onSnapshot(
      collection(db, subsPath),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));
          setSubscriptions(docs);
        } else {
          setSubscriptions(SEED_SUBSCRIPTIONS.map((s) => ({ ...s, userId })));
        }
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, subsPath)
    );

    return () => {
      unsubsParties();
      unsubsItems();
      unsubsTxns();
      unsubsExpenses();
      unsubsPayments();
      unsubsSubs();
    };
  }, [user]);

  // Seed demo data directly into user's Firestore cloud database
  const seedInitialDataToFirestore = async () => {
    if (!user) return;
    const uid = user.uid;
    const batch = writeBatch(db);

    for (const p of SEED_PARTIES) {
      const ref = doc(db, 'users', uid, 'parties', p.id);
      batch.set(ref, { ...p, userId: uid });
    }

    for (const item of SEED_ITEMS) {
      const ref = doc(db, 'users', uid, 'items', item.id);
      batch.set(ref, { ...item, userId: uid });
    }

    for (const txn of SEED_TRANSACTIONS) {
      const ref = doc(db, 'users', uid, 'transactions', txn.id);
      batch.set(ref, { ...txn, userId: uid });
    }

    for (const exp of SEED_EXPENSES) {
      const ref = doc(db, 'users', uid, 'expenses', exp.id);
      batch.set(ref, { ...exp, userId: uid });
    }

    for (const pay of SEED_PAYMENTS) {
      const ref = doc(db, 'users', uid, 'payments', pay.id);
      batch.set(ref, { ...pay, userId: uid });
    }

    for (const sub of SEED_SUBSCRIPTIONS) {
      const ref = doc(db, 'users', uid, 'subscriptions', sub.id);
      batch.set(ref, { ...sub, userId: uid });
    }

    await batch.commit();
  };

  // Live Metrics Computation
  const metrics: BusinessMetrics = useMemo(() => {
    let totalSales = 0;
    let totalPurchases = 0;
    let cogs = 0; // Cost of goods sold

    transactions.forEach((tx) => {
      if (tx.type === 'sale') {
        totalSales += tx.grandTotal;
        // Estimate COGS from line items
        tx.items.forEach((li) => {
          const itemDef = items.find((it) => it.id === li.itemId || it.name.toLowerCase() === li.name.toLowerCase());
          const cost = itemDef ? itemDef.purchasePrice : li.unitPrice * 0.75;
          cogs += cost * li.quantity;
        });
      } else if (tx.type === 'purchase') {
        totalPurchases += tx.grandTotal;
      } else if (tx.type === 'sale_return') {
        totalSales -= tx.grandTotal;
      } else if (tx.type === 'purchase_return') {
        totalPurchases -= tx.grandTotal;
      }
    });

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    const receivables = parties
      .filter((p) => p.type === 'customer' && p.currentBalance > 0)
      .reduce((acc, curr) => acc + curr.currentBalance, 0);

    const payables = parties
      .filter((p) => p.type === 'supplier' && p.currentBalance > 0)
      .reduce((acc, curr) => acc + curr.currentBalance, 0);

    const lowStockItemsCount = items.filter((i) => i.stock <= i.minStockAlert).length;

    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const recurringActiveCount = activeSubs.length;
    const monthlyRecurringRevenue = activeSubs.reduce((acc, curr) => {
      if (curr.frequency === 'weekly') return acc + curr.grandTotal * 4.33;
      if (curr.frequency === 'monthly') return acc + curr.grandTotal;
      if (curr.frequency === 'quarterly') return acc + curr.grandTotal / 3;
      if (curr.frequency === 'yearly') return acc + curr.grandTotal / 12;
      return acc + curr.grandTotal;
    }, 0);

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      receivables,
      payables,
      lowStockItemsCount,
      totalInvoicesCount: transactions.length,
      recurringActiveCount,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue),
    };
  }, [transactions, items, expenses, parties, subscriptions]);

  // Parties CRUD
  const addParty = async (partyData: Omit<Party, 'id' | 'userId' | 'createdAt'>): Promise<Party> => {
    const id = `party_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newParty: Party = {
      ...partyData,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/parties/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'parties', id), newParty);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setParties((prev) => [newParty, ...prev]);
    }
    return newParty;
  };

  const updateParty = async (id: string, updates: Partial<Party>) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/parties/${id}`;
      try {
        await updateDoc(doc(db, 'users', userId, 'parties', id), updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setParties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    }
  };

  const deleteParty = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/parties/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'parties', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setParties((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Items CRUD
  const addItem = async (itemData: Omit<Item, 'id' | 'userId' | 'createdAt'>): Promise<Item> => {
    const id = `item_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newItem: Item = {
      ...itemData,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/items/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'items', id), newItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setItems((prev) => [newItem, ...prev]);
    }
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/items/${id}`;
      try {
        await updateDoc(doc(db, 'users', userId, 'items', id), updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    }
  };

  const deleteItem = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/items/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'items', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const adjustStock = async (itemId: string, newStock: number) => {
    await updateItem(itemId, { stock: newStock });
  };

  // Transactions (Invoices, Purchases, Returns)
  const addTransaction = async (
    txnData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
  ): Promise<Transaction> => {
    const id = `txn_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newTxn: Transaction = {
      ...txnData,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/transactions/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'transactions', id), newTxn);

        // Adjust Party balance
        if (newTxn.partyId && newTxn.balanceAmount !== 0) {
          const party = parties.find((p) => p.id === newTxn.partyId);
          if (party) {
            const delta =
              newTxn.type === 'sale'
                ? newTxn.balanceAmount
                : newTxn.type === 'purchase'
                ? newTxn.balanceAmount
                : -newTxn.balanceAmount;
            await updateParty(party.id, { currentBalance: (party.currentBalance || 0) + delta });
          }
        }

        // Adjust Inventory stocks
        for (const line of newTxn.items) {
          if (line.itemId) {
            const item = items.find((i) => i.id === line.itemId);
            if (item) {
              const stockDelta =
                newTxn.type === 'sale'
                  ? -line.quantity
                  : newTxn.type === 'purchase'
                  ? line.quantity
                  : newTxn.type === 'sale_return'
                  ? line.quantity
                  : -line.quantity;
              await updateItem(item.id, { stock: Math.max(0, item.stock + stockDelta) });
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      // Local optimistic update
      setTransactions((prev) => [newTxn, ...prev]);

      if (newTxn.partyId) {
        setParties((prev) =>
          prev.map((p) => {
            if (p.id === newTxn.partyId) {
              const delta =
                newTxn.type === 'sale'
                  ? newTxn.balanceAmount
                  : newTxn.type === 'purchase'
                  ? newTxn.balanceAmount
                  : -newTxn.balanceAmount;
              return { ...p, currentBalance: (p.currentBalance || 0) + delta };
            }
            return p;
          })
        );
      }

      for (const line of newTxn.items) {
        if (line.itemId) {
          setItems((prev) =>
            prev.map((i) => {
              if (i.id === line.itemId) {
                const stockDelta =
                  newTxn.type === 'sale'
                    ? -line.quantity
                    : newTxn.type === 'purchase'
                    ? line.quantity
                    : newTxn.type === 'sale_return'
                    ? line.quantity
                    : -line.quantity;
                return { ...i, stock: Math.max(0, i.stock + stockDelta) };
              }
              return i;
            })
          );
        }
      }
    }
    return newTxn;
  };

  const deleteTransaction = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Expenses CRUD
  const addExpense = async (
    expenseData: Omit<Expense, 'id' | 'userId' | 'createdAt'>
  ): Promise<Expense> => {
    const id = `exp_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newExpense: Expense = {
      ...expenseData,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/expenses/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'expenses', id), newExpense);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setExpenses((prev) => [newExpense, ...prev]);
    }
    return newExpense;
  };

  const deleteExpense = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/expenses/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'expenses', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // Payments CRUD
  const addPayment = async (
    paymentData: Omit<PaymentRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<PaymentRecord> => {
    const id = `pay_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newPayment: PaymentRecord = {
      ...paymentData,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/payments/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'payments', id), newPayment);
        // Adjust Party balance
        if (newPayment.partyId) {
          const party = parties.find((p) => p.id === newPayment.partyId);
          if (party) {
            // If payment in (customer paid us), their outstanding receivable reduces
            // If payment out (we paid supplier), their outstanding payable reduces
            const delta = -newPayment.amount;
            await updateParty(party.id, {
              currentBalance: Math.max(0, (party.currentBalance || 0) + delta),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setPayments((prev) => [newPayment, ...prev]);
      if (newPayment.partyId) {
        setParties((prev) =>
          prev.map((p) =>
            p.id === newPayment.partyId
              ? { ...p, currentBalance: Math.max(0, (p.currentBalance || 0) - newPayment.amount) }
              : p
          )
        );
      }
    }
    return newPayment;
  };

  const deletePayment = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/payments/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'payments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setPayments((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Subscriptions & Recurring Invoices CRUD
  const addSubscription = async (
    subData: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'generatedCount'>
  ): Promise<Subscription> => {
    const id = `sub_${Date.now()}`;
    const userId = user?.uid || 'demo_user';
    const newSub: Subscription = {
      ...subData,
      id,
      userId,
      generatedCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (user) {
      const path = `users/${userId}/subscriptions/${id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'subscriptions', id), newSub);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setSubscriptions((prev) => [newSub, ...prev]);
    }
    return newSub;
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/subscriptions/${id}`;
      try {
        await updateDoc(doc(db, 'users', userId, 'subscriptions', id), updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    }
  };

  const deleteSubscription = async (id: string) => {
    const userId = user?.uid || 'demo_user';
    if (user) {
      const path = `users/${userId}/subscriptions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'subscriptions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // 1-Click Generate Sale Invoice from Subscription
  const generateInvoiceFromSubscription = async (subscriptionId: string): Promise<Transaction> => {
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error('Subscription schedule not found');

    const todayStr = new Date().toISOString().split('T')[0];
    const dueDateStr = new Date(Date.now() + (sub.paymentTermsDays || 15) * 86400000)
      .toISOString()
      .split('T')[0];
    const newInvNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTxn = await addTransaction({
      type: 'sale',
      invoiceNumber: newInvNumber,
      date: todayStr,
      dueDate: dueDateStr,
      partyId: sub.clientPartyId,
      partyName: sub.clientName,
      partyPhone: sub.clientPhone,
      partyGstin: '',
      isInterState: sub.isInterState,
      items: sub.items,
      subtotal: sub.subtotal,
      discount: sub.discount,
      taxTotal: sub.taxTotal,
      cgst: sub.cgst,
      sgst: sub.sgst,
      igst: sub.igst,
      grandTotal: sub.grandTotal,
      paidAmount: 0,
      balanceAmount: sub.grandTotal,
      paymentMode: 'Credit',
      paymentStatus: 'unpaid',
      notes: `Automated recurring billing (${sub.frequency.toUpperCase()}). ${sub.notes || ''}`,
      template: 'modern',
      isGSTInvoice: sub.isGSTInvoice,
    });

    // Advance next billing date
    const nextDate = computeNextBillingDate(sub.nextBillingDate || todayStr, sub.frequency);
    await updateSubscription(sub.id, {
      nextBillingDate: nextDate,
      lastGeneratedInvoiceId: newTxn.invoiceNumber,
      lastGeneratedDate: todayStr,
      generatedCount: (sub.generatedCount || 0) + 1,
    });

    return newTxn;
  };

  // Bulk process all recurring schedules that are due
  const bulkProcessDueSubscriptions = async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const dueSubs = subscriptions.filter(
      (s) => s.status === 'active' && s.nextBillingDate && s.nextBillingDate <= today
    );

    for (const sub of dueSubs) {
      await generateInvoiceFromSubscription(sub.id);
    }

    return dueSubs.length;
  };

  return (
    <BillingContext.Provider
      value={{
        parties,
        items,
        transactions,
        expenses,
        payments,
        subscriptions,
        metrics,
        loading,
        addParty,
        updateParty,
        deleteParty,
        addItem,
        updateItem,
        deleteItem,
        adjustStock,
        addTransaction,
        deleteTransaction,
        addExpense,
        deleteExpense,
        addPayment,
        deletePayment,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        generateInvoiceFromSubscription,
        bulkProcessDueSubscriptions,
        seedInitialDataToFirestore,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
