import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Group, type IGroupDocument } from '../models/Group.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createExpenseSchema } from '../types/schemas.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================================================
// Helper: Verify user is a member of the group
// ============================================================================

type GroupCheckResult =
  | { success: true; group: IGroupDocument }
  | { success: false; error: string; status: 400 | 403 | 404 };

async function assertGroupMember(
  groupId: string,
  userId: string
): Promise<GroupCheckResult> {
  if (!Types.ObjectId.isValid(groupId)) {
    return { success: false, error: 'Invalid group ID', status: 400 };
  }

  const group = await Group.findById(groupId);
  if (!group) {
    return { success: false, error: 'Group not found', status: 404 };
  }

  const isMember = group.memberIds.some((m) => m.toString() === userId);
  if (!isMember) {
    return {
      success: false,
      error: 'You are not a member of this group',
      status: 403,
    };
  }

  return { success: true, group };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/groups/:groupId/expenses
 * Adds a new expense to a group.
 * Body: { description, amount, paidById, splitBetween[] }
 */
router.post('/groups/:groupId/expenses', async (req: Request, res: Response) => {
  const parseResult = createExpenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }

  try {
    const userId = req.user!.userId;
    const groupId = req.params.groupId as string;

    const result = await assertGroupMember(groupId, userId);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error });
    }

    const { group } = result;
    const { description, amount, paidById, splitBetween } = parseResult.data;

    // Verify paidById is a group member
    const paidByIsMember = group.memberIds.some((m) => m.toString() === paidById);
    if (!paidByIsMember) {
      return res.status(400).json({ error: 'paidById must be a group member' });
    }

    // Verify all splitBetween IDs are group members
    const memberSet = new Set(group.memberIds.map((m) => m.toString()));
    const allSplitMembersValid = splitBetween.every((id) => memberSet.has(id));
    if (!allSplitMembersValid) {
      return res.status(400).json({
        error: 'splitBetween contains non-members',
      });
    }

    const expense = await Expense.create({
      groupId: group._id,
      paidById,
      amount,
      description,
      splitBetween,
    });

    return res.status(201).json({ expense: expense.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/groups/:groupId/expenses
 * Lists all expenses in a group, sorted by newest first.
 */
router.get('/groups/:groupId/expenses', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.groupId as string;

    const result = await assertGroupMember(groupId, userId);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error });
    }

    const expenses = await Expense.find({ groupId }).sort({ createdAt: -1 });
    return res.json({ expenses: expenses.map((e) => e.toJSON()) });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/expenses/:id
 * Deletes an expense. Only the payer OR the group owner can delete.
 */
router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const expenseId = req.params.id as string;

    if (!Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Permission: payer OR group owner
    const isPayer = expense.paidById.toString() === userId;
    const isOwner = group.ownerId.toString() === userId;
    if (!isPayer && !isOwner) {
      return res.status(403).json({
        error: 'Only the payer or group owner can delete this expense',
      });
    }

    await expense.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;