import AgoraChat from "agora-chat";
import type { Connection } from "agora-chat";

/**
 * Creates an Agora Chat SDK connection instance
 * Message roaming is enabled by default in Agora Chat SDK
 * This ensures messages are stored on the server and can be retrieved
 * by recipients even when they're offline or on different devices
 */
export function createChatClient(appKey: string): Connection {
  return new AgoraChat.connection({ appKey }) as unknown as Connection;
}
