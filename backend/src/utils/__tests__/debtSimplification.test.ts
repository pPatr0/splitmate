import { describe, it, expect } from 'vitest';
import {
  computeBalances,
  simplifyDebts,
  type ExpenseInput,
  type UserBalance,
} from '../debtSimplification.js';

// ============================================================================
// Helpers
// ============================================================================

/** Sum all balances - should always equal 0 (conservation law) */
function sumBalances(balances: UserBalance[]): number {
  return balances.reduce((sum, b) => sum + b.balance, 0);
}

/** Find a user's balance in the array */
function balanceOf(balances: UserBalance[], userId: string): number {
  return balances.find((b) => b.userId === userId)?.balance ?? 0;
}

// ============================================================================
// computeBalances tests
// ============================================================================

describe('computeBalances', () => {
  it('returns empty array for empty expenses', () => {
    expect(computeBalances([])).toEqual([]);
  });

  it('handles single expense between two people equally', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice', 'bob'] },
    ];

    const balances = computeBalances(expenses);

    expect(balanceOf(balances, 'alice')).toBe(50);
    expect(balanceOf(balances, 'bob')).toBe(-50);
    expect(sumBalances(balances)).toBe(0);
  });

  it('handles single-person expense (paid only by themselves)', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice'] },
    ];

    const balances = computeBalances(expenses);
    expect(balanceOf(balances, 'alice')).toBe(0);
  });

  it('accumulates balances across multiple expenses', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice', 'bob'] },
      { paidById: 'bob', amount: 60, splitBetween: ['alice', 'bob'] },
    ];

    const balances = computeBalances(expenses);
    expect(balanceOf(balances, 'alice')).toBe(20);
    expect(balanceOf(balances, 'bob')).toBe(-20);
    expect(sumBalances(balances)).toBe(0);
  });

  it('handles three-way split', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 300, splitBetween: ['alice', 'bob', 'carol'] },
    ];

    const balances = computeBalances(expenses);
    expect(balanceOf(balances, 'alice')).toBe(200);
    expect(balanceOf(balances, 'bob')).toBe(-100);
    expect(balanceOf(balances, 'carol')).toBe(-100);
    expect(sumBalances(balances)).toBe(0);
  });

  it('preserves conservation law for complex scenarios', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 400, splitBetween: ['alice', 'bob', 'carol', 'david'] },
      { paidById: 'bob', amount: 200, splitBetween: ['alice', 'bob', 'carol', 'david'] },
      { paidById: 'carol', amount: 600, splitBetween: ['carol', 'david'] },
    ];

    const balances = computeBalances(expenses);
    expect(Math.abs(sumBalances(balances))).toBeLessThan(0.05);
  });

  it('handles floating-point rounding (100 / 3)', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice', 'bob', 'carol'] },
    ];

    const balances = computeBalances(expenses);
    expect(Math.abs(sumBalances(balances))).toBeLessThan(0.05);
  });

  it('returns balances sorted descending (creditors first)', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice', 'bob'] },
      { paidById: 'carol', amount: 200, splitBetween: ['carol', 'david'] },
    ];

    const balances = computeBalances(expenses);

    for (let i = 0; i < balances.length - 1; i++) {
      expect(balances[i].balance).toBeGreaterThanOrEqual(balances[i + 1].balance);
    }
  });
});

// ============================================================================
// simplifyDebts tests
// ============================================================================

describe('simplifyDebts', () => {
  it('returns empty array when all balances are zero', () => {
    const balances: UserBalance[] = [
      { userId: 'alice', balance: 0 },
      { userId: 'bob', balance: 0 },
    ];

    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('handles simple two-person debt', () => {
    const balances: UserBalance[] = [
      { userId: 'alice', balance: 50 },
      { userId: 'bob', balance: -50 },
    ];

    const transactions = simplifyDebts(balances);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual({
      fromUserId: 'bob',
      toUserId: 'alice',
      amount: 50,
    });
  });

  it('produces N-1 or fewer transactions for N non-zero users', () => {
    const balances: UserBalance[] = [
      { userId: 'a', balance: 100 },
      { userId: 'b', balance: 50 },
      { userId: 'c', balance: -75 },
      { userId: 'd', balance: -75 },
    ];

    const transactions = simplifyDebts(balances);
    expect(transactions.length).toBeLessThanOrEqual(3);
  });

  it('settles all debts (sum of inflows = outflows per user)', () => {
    const balances: UserBalance[] = [
      { userId: 'alice', balance: 250 },
      { userId: 'bob', balance: 50 },
      { userId: 'carol', balance: 150 },
      { userId: 'david', balance: -450 },
    ];

    const transactions = simplifyDebts(balances);

    for (const user of balances) {
      const received = transactions
        .filter((t) => t.toUserId === user.userId)
        .reduce((sum, t) => sum + t.amount, 0);
      const paid = transactions
        .filter((t) => t.fromUserId === user.userId)
        .reduce((sum, t) => sum + t.amount, 0);

      expect(Math.abs(received - paid - user.balance)).toBeLessThan(0.01);
    }
  });

  it('never produces negative or zero transactions', () => {
    const balances: UserBalance[] = [
      { userId: 'a', balance: 100 },
      { userId: 'b', balance: -100 },
    ];

    const transactions = simplifyDebts(balances);

    for (const t of transactions) {
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it('chains transactions through largest debtor / creditor', () => {
    const balances: UserBalance[] = [
      { userId: 'alice', balance: 250 },
      { userId: 'carol', balance: 150 },
      { userId: 'bob', balance: 50 },
      { userId: 'david', balance: -450 },
    ];

    const transactions = simplifyDebts(balances);

    expect(transactions).toHaveLength(3);

    transactions.forEach((t) => {
      expect(t.fromUserId).toBe('david');
    });

    const aliceReceived = transactions.find((t) => t.toUserId === 'alice')?.amount;
    const carolReceived = transactions.find((t) => t.toUserId === 'carol')?.amount;
    const bobReceived = transactions.find((t) => t.toUserId === 'bob')?.amount;

    expect(aliceReceived).toBe(250);
    expect(carolReceived).toBe(150);
    expect(bobReceived).toBe(50);
  });

  it('does not mutate input balances', () => {
    const balances: UserBalance[] = [
      { userId: 'a', balance: 100 },
      { userId: 'b', balance: -100 },
    ];

    const snapshot = JSON.parse(JSON.stringify(balances));
    simplifyDebts(balances);

    expect(balances).toEqual(snapshot);
  });

  it('handles fractional balances (after share computation)', () => {
    const balances: UserBalance[] = [
      { userId: 'a', balance: 66.67 },
      { userId: 'b', balance: -33.33 },
      { userId: 'c', balance: -33.34 },
    ];

    const transactions = simplifyDebts(balances);

    transactions.forEach((t) => {
      expect(t.amount).toBeGreaterThan(0);
    });

    const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
    const expectedTotal = balances
      .filter((b) => b.balance > 0)
      .reduce((sum, b) => sum + b.balance, 0);

    expect(Math.abs(totalPaid - expectedTotal)).toBeLessThan(0.01);
  });
});

// ============================================================================
// Integration tests: end-to-end (expenses → balances → transactions)
// ============================================================================

describe('end-to-end: expenses → transactions', () => {
  it('Berlin trip scenario: 4 people, 3 expenses → minimal settlement', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 400, splitBetween: ['alice', 'bob', 'carol', 'david'] },
      { paidById: 'bob', amount: 200, splitBetween: ['alice', 'bob', 'carol', 'david'] },
      { paidById: 'carol', amount: 600, splitBetween: ['carol', 'david'] },
    ];

    const balances = computeBalances(expenses);
    const transactions = simplifyDebts(balances);

    expect(transactions.length).toBeLessThanOrEqual(3);

    transactions.forEach((t) => expect(t.amount).toBeGreaterThan(0));

    const totalFlow = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalFlow).toBeGreaterThan(0);
  });

  it('symmetric scenario: equal contributions = no transactions needed', () => {
    const expenses: ExpenseInput[] = [
      { paidById: 'alice', amount: 100, splitBetween: ['alice', 'bob'] },
      { paidById: 'bob', amount: 100, splitBetween: ['alice', 'bob'] },
    ];

    const balances = computeBalances(expenses);
    const transactions = simplifyDebts(balances);

    expect(transactions).toEqual([]);
  });
});