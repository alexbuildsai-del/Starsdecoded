import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/api";

async function fetchAdminMe(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}admin/me`, { credentials: "include" });
  if (!res.ok) return false;
  const data = (await res.json()) as { isAdmin: boolean };
  return data.isAdmin === true;
}

/**
 * Returns true only when the currently signed-in user matches ADMIN_USER_ID.
 * Returns false (without a network request) for signed-out visitors.
 * The result is cached for the lifetime of the page session via React Query.
 * The query key includes the user id so the cached value is never shared
 * across different accounts in the same browser session.
 */
export function useIsAdmin(): boolean {
  const { isLoaded, isSignedIn, userId } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-me", userId ?? ""],
    queryFn: fetchAdminMe,
    enabled: isLoaded && isSignedIn === true,
    staleTime: Infinity,
    retry: false,
  });

  return data === true;
}
