import { demoRoom, seededMessages } from "../data/demo-chat.js";
import type { PulseDatabase } from "./client.js";
import { messages, participants, realtimeEvents, rooms } from "./schema.js";

export async function seedDatabase(database: PulseDatabase): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction
      .insert(rooms)
      .values({
        ...demoRoom,
        createdAt: new Date(demoRoom.createdAt),
      })
      .onConflictDoUpdate({
        target: rooms.id,
        set: {
          name: demoRoom.name,
          description: demoRoom.description,
        },
      });

    for (const message of seededMessages) {
      await transaction
        .insert(participants)
        .values(message.sender)
        .onConflictDoUpdate({
          target: participants.id,
          set: { displayName: message.sender.displayName },
        });

      const inserted = await transaction
        .insert(messages)
        .values({
          id: message.id,
          clientMessageId: message.clientMessageId,
          roomId: message.roomId,
          senderId: message.sender.id,
          senderDisplayName: message.sender.displayName,
          body: message.body,
          createdAt: new Date(message.createdAt),
        })
        .onConflictDoNothing()
        .returning({ id: messages.id });

      if (inserted.length > 0) {
        await transaction.insert(realtimeEvents).values({
          roomId: message.roomId,
          messageId: message.id,
          type: "message.created",
          createdAt: new Date(message.createdAt),
        });
      }
    }
  });
}
