import type { ConnectionState } from "@pulse/sdk";

import { useMessageComposer } from "../hooks/use-message-composer";
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
  const composer = useMessageComposer(onSend, roomId);
  const connected = connectionState === "connected";
  return (
    <form
      ref={composer.attach}
      className={cn(
        "row-start-4 flex items-center gap-2 border-t border-border bg-card p-3.5",
        className,
      )}
      onSubmit={composer.submit}
      part="composer"
    >
      <Label className="sr-only" htmlFor={composer.inputId}>
        Message
      </Label>
      <Input
        autoComplete="off"
        className={cn(
          "box-border h-10 min-w-0 w-auto flex-1 rounded-[calc(var(--pulse-radius)*0.7)] bg-background",
          inputClassName,
        )}
        disabled={!connected}
        id={composer.inputId}
        name="message"
        maxLength={500}
        part="input"
        placeholder={connected ? "Write a message…" : "Waiting for connection…"}
        ref={composer.inputRef}
        type="text"
        required
      />
      <Button
        className={cn(
          "box-border h-10 w-20 rounded-[calc(var(--pulse-radius)*0.7)]",
          buttonClassName,
        )}
        disabled={!connected}
        part="send-button"
        type="submit"
      >
        Send
      </Button>
    </form>
  );
}
