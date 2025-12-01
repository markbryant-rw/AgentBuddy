import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

export function TeamSwitcher() {
  const { user } = useAuth();
  const { team } = useTeam();

  // Since users can only be on one team now, hide the switcher
  // This component is no longer needed with the "one team per user" model
  return null;
}
