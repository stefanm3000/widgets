import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "../../helpers/cn";

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-[11px] font-semibold capitalize text-[#6c7067] transition outline-none hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:shadow-sm disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-8 px-2.5",
        sm: "h-7 px-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type ToggleGroupSize = VariantProps<typeof toggleGroupItemVariants>["size"];

const ToggleGroupContext = createContext<{ size?: ToggleGroupSize }>({});

type ToggleGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  children: ReactNode;
  size?: ToggleGroupSize;
};

export function ToggleGroup({
  children,
  className,
  size,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        "inline-flex items-center rounded-xl bg-black/5 p-1",
        className,
      )}
      data-slot="toggle-group"
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

export function ToggleGroupItem({
  className,
  size,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  size?: ToggleGroupSize;
}) {
  const context = useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        toggleGroupItemVariants({ size: size ?? context.size }),
        className,
      )}
      data-slot="toggle-group-item"
      {...props}
    />
  );
}
