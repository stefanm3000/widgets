import type { ConnectionState } from "@pulse/sdk";
import { type FormEvent, useState } from "react";

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
  sending: boolean;
}

export function ChatComposer({
  buttonClassName,
  className,
  connectionState,
  inputClassName,
  onSend,
  roomId,
  sending,
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const connected = connectionState === "connected";
  const canSend = connected && draft.trim().length > 0 && !sending;
  const inputId = `pulse-message-${roomId}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    void onSend(body).then((sent) => {
      if (sent) setDraft("");
    });
  };

  return (
    <form
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border bg-card p-3.5",
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
        className={cn("h-10 rounded-xl bg-background", inputClassName)}
        disabled={!connected || sending}
        id={inputId}
        maxLength={500}
        onChange={(event) => setDraft(event.target.value)}
        part="input"
        placeholder={connected ? "Write a message…" : "Waiting for connection…"}
        type="text"
        value={draft}
      />
      <Button
        className={cn("h-10 rounded-xl", buttonClassName)}
        disabled={!canSend}
        part="send-button"
        type="submit"
      >
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
