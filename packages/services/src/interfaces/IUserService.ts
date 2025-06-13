import type { UserModel } from "@starter-kit/types/user";

export interface IUserService {
  getUserById(userId: string): Promise<UserModel | null>;
  createUser(user: UserModel): Promise<UserModel>;
  updateUser(userId: string, user: UserModel): Promise<UserModel>;
  deleteUser(userId: string): Promise<void>;
}
