import { z } from 'zod';
import { EmployeeModelSchema } from '@starter-kit/types/employee';

export const GetEmployeeParamsSchema = z.object({
  id: z.string().uuid(),
});

export const GetEmployeeResponseSchema = EmployeeModelSchema;