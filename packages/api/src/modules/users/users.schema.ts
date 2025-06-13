import { z } from 'zod';
import { UserModelSchema } from '@starter-kit/types/user';

export const GetUserParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateUserBodySchema = UserModelSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
});

export const UpdateUserBodySchema = UserModelSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export const UserResponseSchema = UserModelSchema;

// Type aliases for handler signatures
export type GetUserParams = z.infer<typeof GetUserParamsSchema>;
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;