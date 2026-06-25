-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "lastMessagePreview" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3);
