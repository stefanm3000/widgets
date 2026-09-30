import { useId, useRef, useState, type FormEvent } from "react";

export function useChannelPopover(create: (name: string) => Promise<unknown>) {
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    try {
      await create(name);
      form.reset();
      setOpen(false);
    } catch {
      // The mutation reports the error and the input keeps its value for retry.
    }
  }

  return { formRef, inputId, open, setOpen, submit };
}
