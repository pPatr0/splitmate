import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroupDocument extends Document {
  name: string;
  ownerId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  createdAt: Date;
}

const groupSchema = new Schema<IGroupDocument>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [1, 'Group name cannot be empty'],
      maxlength: [100, 'Group name too long'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

// Index for performance: queries by member often
groupSchema.index({ memberIds: 1 });

export const Group = mongoose.model<IGroupDocument>('Group', groupSchema);