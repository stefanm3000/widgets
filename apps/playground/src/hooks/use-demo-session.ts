import { usePlaygroundStore } from "../stores/playground-store";

export function useDemoSession() {
  const applyIdentity = usePlaygroundStore((state) => state.applyIdentity);
  const session = usePlaygroundStore((state) => state.session);

  return {
    applyIdentity,
    session,
  };
}
