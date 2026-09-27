import type { FormEvent } from "react";

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
      <input
        className="min-w-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-black/35 focus:border-black/30 focus:ring-2 focus:ring-black/5"
        id="display-name"
        maxLength={80}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        placeholder="Display name"
        value={displayName}
      />
      <button
        className="rounded-xl bg-[#1a1c17] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        type="submit"
      >
        Apply
      </button>
    </form>
  );
}
