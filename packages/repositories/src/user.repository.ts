import supabase from '@starter-kit/supabase/client';
import type { UserDbRecord, UserModel } from '@starter-kit/types/user';
import { toUserModel } from '@starter-kit/transformers';

const TABLE = 'users';

export async function findUserById(id: string): Promise<UserModel | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }

  return data ? toUserModel(data as UserDbRecord) : null;
}

export async function createUser(
  user: Omit<UserDbRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<UserModel | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(user)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data ? toUserModel(data as UserDbRecord) : null;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<UserDbRecord, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserModel | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data ? toUserModel(data as UserDbRecord) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
}