import { createLogger } from "@starter-kit/logger";
import type { UserModel } from "@starter-kit/types/user";
import type { IUserService } from "../interfaces/IUserService";

const logger = createLogger({ service: "user-service" });

async function getUserById(userId: string): Promise<UserModel | null> {
  return null;
}

async function createUser(user: UserModel): Promise<UserModel> {
  return user;
}

async function updateUser(userId: string, user: UserModel): Promise<UserModel> {
  return user;
}

async function deleteUser(userId: string): Promise<void> {
  return;
}

export const userService: IUserService = {
  getUserById,
  createUser,
  updateUser,
  deleteUser
};