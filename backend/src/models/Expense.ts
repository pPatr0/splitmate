import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpenseDocument extends Document {
  groupId: Types.ObjectId;
  paidById: Types.ObjectId;
  amount: number;
  description: string;
  splitBetween: Types.ObjectId[];
  createdAt: Date;
}

const expenseSchema = new Schema<IExpenseDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    paidById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be positive'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [200, 'Description too long'],
    },
    splitBetween: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (arr: Types.ObjectId[]) => arr.length > 0,
        message: 'Expense must be split between at least one person',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for performance: queries by group are very common
expenseSchema.index({ groupId: 1, createdAt: -1 });

export const Expense = mongoose.model<IExpenseDocument>('Expense', expenseSchema);