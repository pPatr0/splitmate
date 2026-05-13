import { z } from 'zod';

// Register request body validation
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
});

// Login request body validation
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Inferred TypeScript types from Zod schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Group schemas
// ============================================================================

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name too long'),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;

// ============================================================================
// Expense schemas
// ============================================================================

export const createExpenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Description cannot be empty')
    .max(200, 'Description too long'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'),
  paidById: z.string().min(1, 'paidById is required'),
  splitBetween: z
    .array(z.string().min(1))
    .min(1, 'Expense must be split between at least one person'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;