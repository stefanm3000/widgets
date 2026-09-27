import { type FormEvent, useState } from "react";

import {
  createDemoSession,
  getApiUrl,
  getDefaultDisplayName,
  saveDisplayName,
} from "../helpers/demo-session";

export function useDemoSession() {
  const [apiUrl] = useState(getApiUrl);
  const [session, setSession] = useState(() =>
    createDemoSession(apiUrl, getDefaultDisplayName()),
  );
  const [displayName, setDisplayName] = useState(session.displayName);

  const applyIdentity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) return;

    session.client.dispose();
    saveDisplayName(nextName);
    setSession(createDemoSession(apiUrl, nextName));
  };

  return {
    applyIdentity,
    displayName,
    session,
    setDisplayName,
  };
}
