import { z } from 'zod';

export const EmployeeModelSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export type EmployeeModel = z.infer<typeof EmployeeModelSchema>;