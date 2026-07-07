import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/data";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadNotificationCount() : 0;
  return (
    <NavbarClient
      unreadCount={unreadCount}
      user={
        user
          ? {
              id: user.id,
              email: user.email,
              name: user.profile?.full_name ?? null,
              isAdmin: user.profile?.is_admin ?? false,
            }
          : null
      }
    />
  );
}
