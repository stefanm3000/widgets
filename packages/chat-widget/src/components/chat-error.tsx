import { Marker, MarkerContent } from "./ui/marker.js";

export function ChatError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Marker
      className="border-t border-destructive/25 bg-destructive/10 px-4 py-2 text-destructive"
      part="error"
      role="alert"
    >
      <MarkerContent>{message}</MarkerContent>
    </Marker>
  );
}
