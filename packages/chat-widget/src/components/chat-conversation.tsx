import { useChatConversation } from "../hooks/use-chat-conversation";
import type { ChatWidgetProps } from "../types";
import { ChatComposer } from "./chat-composer";
import { ChatError } from "./chat-error";
import { ChatHeader } from "./chat-header";
import { ChatTranscript } from "./chat-transcript";

export function ChatConversation({
  client,
  roomId,
  classNames = {},
}: Pick<ChatWidgetProps, "client" | "roomId" | "classNames">) {
  const conversation = useChatConversation(client, roomId);

  return (
    <div
      ref={conversation.attach}
      className="pulse-conversation col-start-2 row-span-4 grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-subgrid"
      part="conversation"
    >
      <ChatHeader
        className={classNames.header}
        connectionState={conversation.connectionState}
        roomName={conversation.roomName}
        statusClassName={classNames.connectionStatus}
      />
      <ChatTranscript
        className={classNames.messageList}
        currentUserId={conversation.currentUserId}
        loading={conversation.loading}
        hasEarlierMessages={conversation.hasEarlierMessages}
        loadingEarlierMessages={conversation.loadingEarlierMessages}
        onLoadEarlier={conversation.loadEarlierMessages}
        messageClassName={classNames.message}
        messages={conversation.messages}
        outlineClassName={classNames.messageOutline}
      />
      <ChatError message={conversation.error} />
      <ChatComposer
        buttonClassName={classNames.sendButton}
        className={classNames.composer}
        connectionState={conversation.connectionState}
        inputClassName={classNames.input}
        onSend={conversation.send}
        roomId={roomId}
      />
    </div>
  );
}
