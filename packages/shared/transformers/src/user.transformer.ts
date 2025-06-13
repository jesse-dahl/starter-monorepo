import type { UserDbRecord, UserModel } from '@starter-kit/types/user';

export function toUserModel(dbRecord: UserDbRecord): UserModel {
  return {
    id: dbRecord.id,
    firstName: dbRecord.first_name,
    lastName: dbRecord.last_name,
    email: dbRecord.email,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

export function toUserDbRecord(model: UserModel): UserDbRecord {
  return {
    id: model.id,
    first_name: model.firstName,
    last_name: model.lastName,
    email: model.email,
    created_at: model.createdAt,
    updated_at: model.updatedAt,
  };
}