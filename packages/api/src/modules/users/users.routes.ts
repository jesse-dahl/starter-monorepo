import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import {
  GetUserParamsSchema,
  GetUserParams,
  CreateUserBodySchema,
  CreateUserBody,
  UpdateUserBodySchema,
  UpdateUserBody,
  UserResponseSchema,
  UserResponse,
} from './users.schema';
import {
  findUserById,
  createUser,
  updateUser,
  deleteUser,
} from '@starter-kit/repositories';

export async function userRoutes(app: FastifyInstance) {
  // enable Zod-based validation & serialization
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // GET /users/:id
  app.get(
    '/:id',
    {
      schema: {
        params: GetUserParamsSchema,
        response: { 200: UserResponseSchema },
      },
    },
    async (
      request: FastifyRequest<{ Params: GetUserParams }>,
      reply: FastifyReply
    ) => {
      const user = await findUserById(request.params.id);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return user;
    }
  );

  // POST /users
  app.post(
    '/',
    {
      schema: {
        body: CreateUserBodySchema,
        response: { 201: UserResponseSchema },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateUserBody }>,
      reply: FastifyReply
    ) => {
      const { firstName, lastName, email } = request.body;
      const newUser = await createUser({
        first_name: firstName,
        last_name: lastName,
        email,
      });
      return reply.code(201).send(newUser);
    }
  );

  // PUT /users/:id
  app.put(
    '/:id',
    {
      schema: {
        params: GetUserParamsSchema,
        body: UpdateUserBodySchema,
        response: { 200: UserResponseSchema },
      },
    },
    async (
      request: FastifyRequest<{ Params: GetUserParams; Body: UpdateUserBody }>,
      reply: FastifyReply
    ) => {
      const updated = await updateUser(request.params.id, request.body);
      return updated;
    }
  );

  // DELETE /users/:id
  app.delete(
    '/:id',
    {
      schema: {
        params: GetUserParamsSchema,
        response: { 200: UserResponseSchema },
      },
    },
    async (
      request: FastifyRequest<{ Params: GetUserParams }>,
      reply: FastifyReply
    ) => {
      const success = await deleteUser(request.params.id);
      return { success };
    }
  );
}