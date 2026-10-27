export type UserRole = 'admin' | 'user';

export class User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  createdAt: Date;
  updatedAt: Date;
}
