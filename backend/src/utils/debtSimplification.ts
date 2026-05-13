/**
 * Debt Simplification Algorithm
 *
 * Given a list of expenses in a group, computes:
 *   1. Net balance per user (positive = creditor, negative = debtor)
 *   2. Minimum set of transactions to settle all debts
 *
 * Algorithm: greedy matching of largest debtor to largest creditor.
 * Complexity: O(N log N) sort + O(N) pairing = O(N log N) total.
 *
 * Limitations: Currently assumes equal split (amount / splitBetween.length).
 * For percentage or share-based splits, this would need extension.
 */

// ============================================================================
// Types
// ============================================================================

export interface ExpenseInput {
  paidById: string;
  amount: number;
  splitBetween: string[];
}

export interface UserBalance {
  userId: string;
  /** Positive = others owe this user. Negative = this user owes others. */
  balance: number;
}

export interface Transaction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Computes net balance per user from a list of expenses.
 * Returns balances sorted by amount (largest creditor first, largest debtor last).
 *
 * Mathematical invariant: sum of all balances === 0.
 */
export function computeBalances(expenses: ExpenseInput[]): UserBalance[] {
  // Sum balances per user
  const balanceMap = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.splitBetween.length === 0) {
      // Defensive: skip malformed expense (shouldn't happen with validation)
      continue;
    }

    const sharePerPerson = expense.amount / expense.splitBetween.length;

    // Payer is credited the full amount
    addToBalance(balanceMap, expense.paidById, expense.amount);

    // Each person in splitBetween is debited their share
    for (const userId of expense.splitBetween) {
      addToBalance(balanceMap, userId, -sharePerPerson);
    }
  }

  // Convert to array, sort by balance descending (creditors first)
  const balances: UserBalance[] = Array.from(balanceMap.entries()).map(
    ([userId, balance]) => ({
      userId,
      balance: roundCurrency(balance),
    })
  );

  return balances.sort((a, b) => b.balance - a.balance);
}

/**
 * Given balances, computes minimum set of transactions to settle debts.
 * Uses greedy algorithm: match largest debtor to largest creditor.
 *
 * @returns Array of transactions, each indicating who pays whom how much.
 */
export function simplifyDebts(balances: UserBalance[]): Transaction[] {
  // Filter out users with zero balance (already settled)
  const nonZero = balances.filter((b) => Math.abs(b.balance) > EPSILON);

  // Separate creditors (positive) and debtors (negative)
  // Use copies to avoid mutating input
  const creditors = nonZero
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = nonZero
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance); // most negative first

  const transactions: Transaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    // Transaction amount = min of what creditor is owed and what debtor owes
    const amount = Math.min(creditor.balance, -debtor.balance);
    const rounded = roundCurrency(amount);

    if (rounded > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: rounded,
      });
    }

    // Update balances
    creditor.balance = roundCurrency(creditor.balance - amount);
    debtor.balance = roundCurrency(debtor.balance + amount);

    // Remove settled users
    if (Math.abs(creditor.balance) < EPSILON) creditors.shift();
    if (Math.abs(debtor.balance) < EPSILON) debtors.shift();
  }

  return transactions;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Floating-point comparison tolerance.
 * Currency rarely needs precision beyond 2 decimals, so 0.001 is safe.
 */
const EPSILON = 0.001;

/**
 * Round currency to 2 decimals to avoid floating-point drift.
 * E.g. 0.1 + 0.2 = 0.30000000000000004 → 0.30
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Add delta to user's balance in the map (create entry if missing).
 */
function addToBalance(map: Map<string, number>, userId: string, delta: number): void {
  const current = map.get(userId) ?? 0;
  map.set(userId, current + delta);
}