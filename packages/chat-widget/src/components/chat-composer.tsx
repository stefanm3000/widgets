import type { ConnectionState } from "@pulse/sdk";
import { type FormEvent, useRef, useState } from "react";

import { cn } from "../utils/cn";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface ChatComposerProps {
  buttonClassName?: string;
  className?: string;
  connectionState: ConnectionState;
  inputClassName?: string;
  onSend: (body: string) => Promise<boolean>;
  roomId: string;
}

export function ChatComposer({
  buttonClassName,
  className,
  connectionState,
  inputClassName,
  onSend,
  roomId,
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const connected = connectionState === "connected";
  const canSend = connected && draft.trim().length > 0;
  const inputId = `pulse-message-${roomId}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setDraft("");
    inputRef.current?.focus();
    void onSend(body).then((sent) => {
      if (!sent) {
        setDraft((currentDraft) => currentDraft || body);
      }
    });
  };

  return (
    <form
      className={cn(
        "flex items-center gap-2 border-t border-border bg-card p-3.5",
        className,
      )}
      onSubmit={submit}
      part="composer"
    >
      <Label className="sr-only" htmlFor={inputId}>
        Message
      </Label>
      <Input
        autoComplete="off"
        className={cn(
          "box-border h-10 min-w-0 w-auto flex-1 rounded-[calc(var(--pulse-radius)*0.7)] bg-background",
          inputClassName,
        )}
        disabled={!connected}
        id={inputId}
        maxLength={500}
        onChange={(event) => setDraft(event.target.value)}
        part="input"
        placeholder={connected ? "Write a message…" : "Waiting for connection…"}
        ref={inputRef}
        type="text"
        value={draft}
      />
      <Button
        className={cn(
          "box-border h-10 w-20 rounded-[calc(var(--pulse-radius)*0.7)]",
          buttonClassName,
        )}
        disabled={!canSend}
        part="send-button"
        type="submit"
      >
        Send
      </Button>
    </form>
  );
}
