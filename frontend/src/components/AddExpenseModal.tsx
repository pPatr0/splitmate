import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { createExpense, ApiError, type Expense, type GroupMember } from '../lib/api';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onExpenseCreated: (expense: Expense) => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  currentUserId,
  onExpenseCreated,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState<string>(currentUserId);
  const [splitBetween, setSplitBetween] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSplitMember = (memberId: string) => {
    setSplitBetween((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const parsedAmount = parseFloat(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const perPersonAmount =
    isAmountValid && splitBetween.size > 0
      ? (parsedAmount / splitBetween.size).toFixed(2)
      : '0.00';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (splitBetween.size === 0) {
      setError('Select at least one person to split between');
      return;
    }

    setIsSubmitting(true);

    try {
      const { expense } = await createExpense(groupId, {
        description: description.trim(),
        amount: parsedAmount,
        paidById,
        splitBetween: Array.from(splitBetween),
      });
      onExpenseCreated(expense);
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create expense');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setAmount('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Description */}
        <div>
          <label
            htmlFor="expense-description"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            What is this for?
          </label>
          <input
            id="expense-description"
            type="text"
            required
            minLength={1}
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, taxi, groceries..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Amount */}
        <div>
          <label
            htmlFor="expense-amount"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Amount
          </label>
          <input
            id="expense-amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Paid by */}
        <div>
          <label
            htmlFor="expense-paid-by"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Paid by
          </label>
          <select
            id="expense-paid-by"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUserId ? `${member.name} (you)` : member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Split between */}
        <div>
          <p className="block text-sm font-medium text-gray-300 mb-2">
            Split between ({splitBetween.size} {splitBetween.size === 1 ? 'person' : 'people'})
          </p>
          <div className="space-y-2 bg-gray-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-700/50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={splitBetween.has(member.id)}
                  onChange={() => toggleSplitMember(member.id)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm text-gray-200">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="text-gray-500 ml-1">(you)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {isAmountValid && splitBetween.size > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Each pays: {perPersonAmount}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !description.trim() ||
              !isAmountValid ||
              splitBetween.size === 0
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}