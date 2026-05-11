// Shared types between backend and frontend
// In a real monorepo, these would be in a shared package

export interface IUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface IGroup {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
}

export interface IExpense {
  id: string;
  groupId: string;
  paidById: string;
  amount: number;
  description: string;
  splitBetween: string[]; // userIds
  createdAt: Date;
}

// Balance: positive = they owe us, negative = we owe them
export interface IBalance {
  userId: string;
  amount: number;
}

// Simplified transaction recommendation
export interface ITransaction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}