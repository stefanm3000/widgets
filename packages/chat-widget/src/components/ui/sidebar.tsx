import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
} from "react";

import { cn } from "../../utils/cn";
import { Button } from "./button";

const SidebarContext = createContext<{
  id: string;
  open: boolean;
  toggle: () => void;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("Sidebar components require a SidebarProvider");
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <SidebarContext
      value={{ id, open, toggle: () => setOpen((value) => !value) }}
    >
      {children}
    </SidebarContext>
  );
}

export function Sidebar({ className, ...props }: ComponentProps<"aside">) {
  const { open } = useSidebar();
  return (
    <aside
      className={cn(
        "pulse-channel-sidebar group/sidebar col-start-1 row-span-4 grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-subgrid bg-card",
        className,
      )}
      data-slot="sidebar"
      data-state={open ? "expanded" : "collapsed"}
      part="sidebar"
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2 px-1.5", className)}
      data-slot="sidebar-header"
      part="sidebar-header"
      {...props}
    />
  );
}

export function SidebarTrigger() {
  const { id, open, toggle } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={open ? "Collapse channels" : "Expand channels"}
      aria-expanded={open}
      aria-controls={id}
      part="sidebar-toggle"
      onClick={toggle}
    >
      {open ? (
        <PanelLeftClose aria-hidden="true" />
      ) : (
        <PanelLeftOpen aria-hidden="true" />
      )}
    </Button>
  );
}

export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  const { id } = useSidebar();
  return (
    <div
      id={id}
      className={cn(
        "row-span-3 flex min-h-0 min-w-0 flex-col gap-2 p-1.5",
        className,
      )}
      data-slot="sidebar-content"
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("m-0 flex min-w-0 list-none flex-col gap-1 p-0", className)}
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

export function SidebarMenuItem(props: ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" {...props} />;
}

export function SidebarMenuButton({
  className,
  isActive = false,
  ...props
}: ComponentProps<typeof Button> & { isActive?: boolean }) {
  return (
    <Button
      variant="ghost"
      type="button"
      className={cn(
        "min-w-0 w-full justify-start px-2.5 text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground group-data-[state=collapsed]/sidebar:size-9 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:p-0",
        className,
      )}
      data-slot="sidebar-menu-button"
      data-active={isActive}
      {...props}
    />
  );
}
