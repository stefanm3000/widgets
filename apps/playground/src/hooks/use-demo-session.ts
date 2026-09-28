import { usePlaygroundStore } from "../stores/playground-store";

export function useDemoSession() {
  const session = usePlaygroundStore((state) => state.session);

  return { session };
}
