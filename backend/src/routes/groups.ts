import { Router, Request, Response } from 'express';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createGroupSchema, addMemberSchema } from '../types/schemas.js';
import { Expense } from '../models/Expense.js';
import { computeBalances, simplifyDebts } from '../utils/debtSimplification.js';

const router = Router();

// All routes in this router require authentication
router.use(requireAuth);

/**
 * POST /api/groups
 * Creates a new group with current user as owner and member.
 */
router.post('/', async (req: Request, res: Response) => {
  const parseResult = createGroupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }

  try {
    const userId = req.user!.userId;
    const { name } = parseResult.data;

    const group = await Group.create({
      name,
      ownerId: userId,
      memberIds: [userId], // Owner is automatically a member
    });

    return res.status(201).json({ group: group.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/groups
 * Returns all groups where the current user is a member.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groups = await Group.find({ memberIds: userId }).sort({ createdAt: -1 });
    return res.json({ groups: groups.map((g) => g.toJSON()) });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/groups/:id
 * Returns group details with populated members.
 * Only accessible to members of the group.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const group = await Group.findById(req.params.id).populate(
      'memberIds',
      'name email'
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.memberIds.some(
      (member) => member._id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    return res.json({ group: group.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/groups/:id/members
 * Adds a new member to the group (by email).
 * Only group members can add new members.
 */
router.post('/:id/members', async (req: Request, res: Response) => {
  const parseResult = addMemberSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }

  try {
    const userId = req.user!.userId;
    const { email } = parseResult.data;

    // Find group
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check requester is a member
    const isMember = group.memberIds.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Find user by email
    const newMember = await User.findOne({ email });
    if (!newMember) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // Check if already a member
    const alreadyMember = group.memberIds.some(
      (m) => m.toString() === newMember.id
    );
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    // Add member
    group.memberIds.push(newMember._id);
    await group.save();

    // Re-fetch with populated members to match GET /:id shape
    const populated = await Group.findById(group._id).populate('memberIds', 'name email');
    return res.status(201).json({ group: populated!.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/groups/:id
 * Deletes the group. Only the owner can delete.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only owner can delete
    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the group owner can delete this group' });
    }

    await group.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/groups/:id/balance
 * Computes net balance per member from all group expenses.
 */
router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id as string;

    const group = await Group.findById(groupId).populate('memberIds', 'name email');
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.memberIds.some(
      (member) => member._id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const expenses = await Expense.find({ groupId });
    const balances = computeBalances(
      expenses.map((e) => ({
        paidById: e.paidById.toString(),
        amount: e.amount,
        splitBetween: e.splitBetween.map((id) => id.toString()),
      }))
    );

    return res.json({ balances });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/groups/:id/settle
 * Returns minimal set of transactions to settle all debts.
 */
router.get('/:id/settle', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id as string;

    const group = await Group.findById(groupId).populate('memberIds', 'name email');
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.memberIds.some(
      (member) => member._id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const expenses = await Expense.find({ groupId });
    const balances = computeBalances(
      expenses.map((e) => ({
        paidById: e.paidById.toString(),
        amount: e.amount,
        splitBetween: e.splitBetween.map((id) => id.toString()),
      }))
    );
    const transactions = simplifyDebts(balances);

    return res.json({ balances, transactions });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;