import { useGetMyPermissionsQuery } from '../../features/permissions/permissionsApi';

/** Returns whether the current user's effective permissions include `name`. */
export function useHasPermission(name: string): boolean {
  const { data } = useGetMyPermissionsQuery();
  return data?.includes(name) ?? false;
}
