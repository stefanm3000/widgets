import { useState } from "react";

import { createDemoSession, getApiUrl } from "../helpers/demo-session";

export function useDemoSession() {
  const [session] = useState(() => createDemoSession(getApiUrl()));
  return { session };
}
