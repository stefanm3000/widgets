import { useForm } from "react-hook-form";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface IdentityFormProps {
  defaultDisplayName: string;
  onSubmit: (displayName: string) => void;
}

export function IdentityForm({
  defaultDisplayName,
  onSubmit,
}: IdentityFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<{ displayName: string }>({
    defaultValues: { displayName: defaultDisplayName },
  });

  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      onSubmit={handleSubmit(({ displayName }) => onSubmit(displayName.trim()))}
    >
      <label className="sr-only" htmlFor="display-name">
        Demo display name
      </label>
      <Input
        aria-invalid={Boolean(errors.displayName)}
        id="display-name"
        maxLength={80}
        placeholder="Display name"
        {...register("displayName", {
          maxLength: 80,
          validate: (value) => Boolean(value.trim()),
        })}
      />
      <Button size="sm" type="submit">
        Apply
      </Button>
    </form>
  );
}
