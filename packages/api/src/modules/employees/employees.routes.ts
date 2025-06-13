import { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import {
  GetEmployeeParamsSchema,
  GetEmployeeResponseSchema,
} from './employees.schema';

export async function employeeRoutes(app: FastifyInstance) {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.get(
    '/:id',
    {
      schema: {
        params: GetEmployeeParamsSchema,
        response: {
          200: GetEmployeeResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };

      // You'd call your service here instead
      return {
        id,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
      };
    }
  );
}