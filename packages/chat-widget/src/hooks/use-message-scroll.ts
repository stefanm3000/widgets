import { useMessageScroller } from "../components/ui/message-scroller";

export function useMessageScroll(messageId: string | undefined) {
  const { scrollToMessage } = useMessageScroller();

  function attach(element: HTMLDivElement | null) {
    if (!element || !messageId) return;
    const frame = requestAnimationFrame(() => {
      scrollToMessage(messageId, { align: "end", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }

  return attach;
}
