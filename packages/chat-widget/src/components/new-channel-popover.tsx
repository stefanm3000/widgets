import { Plus } from "lucide-react";

import type { useChannels } from "../hooks/use-channels";
import { useChannelPopover } from "../hooks/use-channel-popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { SidebarMenuButton } from "./ui/sidebar";

export function NewChannelPopover({
  mutation,
  container,
}: {
  mutation: ReturnType<typeof useChannels>["createChannel"];
  container: HTMLElement | null;
}) {
  const popover = useChannelPopover(mutation.mutateAsync);
  return (
    <Popover
      open={popover.open}
      onOpenChange={(open) => {
        mutation.reset();
        popover.setOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <SidebarMenuButton aria-label="New channel" title="New channel">
          <Plus aria-hidden="true" />
          <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
            New channel
          </span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        container={container}
        aria-label="New channel"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          popover.formRef.current
            ?.querySelector<HTMLInputElement>("input")
            ?.focus();
        }}
      >
        <form
          ref={popover.formRef}
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            if (!mutation.isPending) void popover.submit(event);
            else event.preventDefault();
          }}
        >
          <Label htmlFor={popover.inputId}>Channel name</Label>
          <Input
            id={popover.inputId}
            name="name"
            maxLength={120}
            required
            disabled={mutation.isPending}
          />
          {mutation.error && (
            <p role="alert" className="m-0 text-xs text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button size="sm" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create channel"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={mutation.isPending}
            onClick={() => popover.setOpen(false)}
          >
            Cancel
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
