import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  getGroup,
  deleteGroup,
  listExpenses,
  deleteExpense,
  getSettle,
  ApiError,
  type Group,
  type GroupMember,
  type Expense,
  type UserBalance,
  type Transaction,
} from '../lib/api';
import { AddMemberModal } from '../components/AddMemberModal';
import { AddExpenseModal } from '../components/AddExpenseModal';

export function GroupDetailPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch group details
  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;

    const fetchGroup = async () => {
      try {
        const data = await getGroup(groupId);
        if (!cancelled) {
          setGroup(data.group);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load group');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchGroup();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Fetch expenses for the group
  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;

    const fetchExpenses = async () => {
      try {
        const data = await listExpenses(groupId);
        if (!cancelled) {
          setExpenses(data.expenses);
        }
      } catch (err) {
        console.warn('Failed to load expenses:', err);
      } finally {
        if (!cancelled) setIsExpensesLoading(false);
      }
    };

    fetchExpenses();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Fetch settle data
  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;

    const fetchSettleData = async () => {
      try {
        const data = await getSettle(groupId);
        if (!cancelled) {
          setBalances(data.balances);
          setTransactions(data.transactions);
        }
      } catch {
        // Non-fatal
      }
    };

    fetchSettleData();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handleDelete = async () => {
    if (!group) return;
    if (!confirm(`Delete group "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGroup(group.id);
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete group';
      alert(message);
      setIsDeleting(false);
    }
  };

  const fetchSettle = async () => {
    if (!groupId) return;
    try {
      const data = await getSettle(groupId);
      setBalances(data.balances);
      setTransactions(data.transactions);
    } catch {
      // Non-fatal: settle data is supplementary
    }
  };

  const handleExpenseCreated = (newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    fetchSettle();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;

    try {
      await deleteExpense(expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      fetchSettle();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete expense';
      alert(message);
    }
  };

  // Helper: get member name by ID
  const getMemberName = (memberId: string): string => {
    const memberList = (group?.memberIds ?? []) as GroupMember[];
    const member = memberList.find((m) => m.id === memberId);
    return member?.name ?? 'Unknown';
  };

  const isOwner = group?.ownerId === user?.id;
  const members = (group?.memberIds ?? []) as GroupMember[];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-500 hover:text-blue-400">
            SplitMate
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm mb-6"
        >
          ← Back to groups
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading group...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Group content */}
        {!isLoading && !error && group && (
          <>
            {/* Title section */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
                <p className="text-sm text-gray-500">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete group'}
                </button>
              )}
            </div>

            {/* Members section */}
            <section className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Members ({members.length})
                </h2>
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  + Add member
                </button>
              </div>

              <ul className="divide-y divide-gray-700">
                {members.map((member) => (
                  <li key={member.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">
                        {member.name}
                        {member.id === group.ownerId && (
                          <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                        {member.id === user?.id && (
                          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Balances */}
            {balances.length > 0 && (
              <section className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Balances</h2>
                <ul className="divide-y divide-gray-700">
                  {balances.map((b) => (
                    <li key={b.userId} className="py-2 flex justify-between items-center">
                      <span className="text-gray-300">
                        {getMemberName(b.userId)}
                        {b.userId === user?.id && (
                          <span className="text-gray-500 ml-1">(you)</span>
                        )}
                      </span>
                      <span
                        className={`font-semibold ${
                          b.balance > 0
                            ? 'text-green-400'
                            : b.balance < 0
                              ? 'text-red-400'
                              : 'text-gray-400'
                        }`}
                      >
                        {b.balance > 0 ? '+' : ''}
                        {b.balance.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Settle Up */}
            {transactions.length > 0 && (
              <section className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Settle Up</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Minimum {transactions.length}{' '}
                  {transactions.length === 1 ? 'transaction' : 'transactions'} to settle
                  all debts:
                </p>
                <ul className="space-y-2">
                  {transactions.map((t, i) => (
                    <li
                      key={i}
                      className="bg-gray-900/50 rounded-lg px-4 py-3 flex justify-between items-center"
                    >
                      <span className="text-gray-300">
                        <span className="text-white font-medium">
                          {getMemberName(t.fromUserId)}
                        </span>
                        {' → '}
                        <span className="text-white font-medium">
                          {getMemberName(t.toUserId)}
                        </span>
                      </span>
                      <span className="text-blue-400 font-semibold">
                        {t.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Expenses */}
            <section className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Expenses ({expenses.length})
                </h2>
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  + Add expense
                </button>
              </div>

              {isExpensesLoading && (
                <p className="text-gray-500 text-sm py-4">Loading expenses...</p>
              )}

              {!isExpensesLoading && expenses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">No expenses yet</p>
                  <p className="text-sm text-gray-500">
                    Add your first expense to start tracking.
                  </p>
                </div>
              )}

              {!isExpensesLoading && expenses.length > 0 && (
                <ul className="divide-y divide-gray-700">
                  {expenses.map((expense) => {
                    const canDelete =
                      expense.paidById === user?.id || group.ownerId === user?.id;

                    return (
                      <li key={expense.id} className="py-3 flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {expense.description}
                          </p>
                          <p className="text-sm text-gray-400 mt-0.5">
                            Paid by{' '}
                            <span className="text-gray-300">
                              {getMemberName(expense.paidById)}
                            </span>
                            {' • '}
                            Split between {expense.splitBetween.length}{' '}
                            {expense.splitBetween.length === 1 ? 'person' : 'people'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <p className="text-lg font-semibold text-white whitespace-nowrap">
                            {expense.amount.toFixed(2)}
                          </p>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-400 hover:text-red-300 text-sm transition-colors"
                              aria-label="Delete expense"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Modals */}
            <AddMemberModal
              isOpen={isAddMemberOpen}
              onClose={() => setIsAddMemberOpen(false)}
              groupId={group.id}
              onMemberAdded={(updatedGroup) => setGroup(updatedGroup)}
            />

            <AddExpenseModal
              key={isAddExpenseOpen ? 'open' : 'closed'}
              isOpen={isAddExpenseOpen}
              onClose={() => setIsAddExpenseOpen(false)}
              groupId={group.id}
              members={members}
              currentUserId={user?.id ?? ''}
              onExpenseCreated={handleExpenseCreated}
            />
          </>
        )}
      </main>
    </div>
  );
}