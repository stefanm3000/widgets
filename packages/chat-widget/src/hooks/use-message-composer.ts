import { useId, useRef, type FormEvent } from "react";

import { useWidgetQueryKey } from "./use-widget-query-client";

export function useMessageComposer(
  onSend: (body: string) => Promise<boolean>,
  roomId: string,
) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const scope = useWidgetQueryKey("composer", roomId);
  const activeSession = useRef<{ scope: (string | number)[] } | null>(null);

  function attach(form: HTMLFormElement | null) {
    if (!form) return;
    activeSession.current = { scope };
    form.reset();
    return () => {
      activeSession.current = null;
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    const body = input?.value.trim();
    if (!input || !body || input.disabled) return;
    const session = activeSession.current;
    event.currentTarget.reset();
    input.focus();
    void onSend(body).then((sent) => {
      if (
        !sent &&
        activeSession.current === session &&
        input.isConnected &&
        !input.value
      ) {
        input.value = body;
      }
    });
  }

  return { attach, inputId, inputRef, submit };
}
