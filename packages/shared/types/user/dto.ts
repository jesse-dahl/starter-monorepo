import { z } from 'zod';
import { UserModelSchema } from './model';

// User creation request
export const CreateUserDtoSchema = UserModelSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

// User response (could be identical to model or simpler)
export const UserResponseDtoSchema = UserModelSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;