import { RoleSwitcher } from "@/components/app/role-switcher";
import { getHomePathForRole } from "@/lib/auth/demo-users";
import { getCurrentAppUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const appUser = await getCurrentAppUser();
  if (appUser) {
    redirect(getHomePathForRole(appUser.role));
  }

  return <RoleSwitcher />;
}
