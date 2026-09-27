import type { FormEvent } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface IdentityFormProps {
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function IdentityForm({
  displayName,
  onDisplayNameChange,
  onSubmit,
}: IdentityFormProps) {
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="display-name">
        Demo display name
      </label>
      <Input
        id="display-name"
        maxLength={80}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        placeholder="Display name"
        value={displayName}
      />
      <Button size="sm" type="submit">
        Apply
      </Button>
    </form>
  );
}
