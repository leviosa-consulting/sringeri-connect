import { handleChatMessage, type SuggestedAction } from "./chatbot";

/**
 * Bot replies for the Live Chat widget and the in-app AI Assistant chat.
 *
 * By product decision, replies always come from the deterministic, rule-based
 * responder grounded in Sringeri.net's own data (`handleChatMessage`) — never
 * from an external AI model — so answers are always drawn from verified
 * Sringeri Sharada Peetham information (Task #170).
 */

export interface AiTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiReply {
  reply: string;
  /** Always false: replies are always rule-based, never AI-generated. */
  fromAi: boolean;
  /** The bot itself thinks a human should take over. */
  suggestHandoff: boolean;
  /** Quick-reply topic chips to offer alongside this reply, if any. */
  suggestedActions?: SuggestedAction[];
}

/** Devotee explicitly asking for a person. */
export function wantsHuman(message: string): boolean {
  return /\b(human|agent|person|someone|talk to (a|an|someone)|real person|live chat|customer care|representative|speak to)\b/i.test(message)
    && !/\bbot\b/i.test(message);
}

export async function generateBotReply(history: AiTurn[]): Promise<AiReply> {
  const latest = history.filter((t) => t.role === "user").slice(-1)[0]?.content || "";
  const result = await handleChatMessage(latest);
  return {
    reply: result.reply,
    fromAi: false,
    suggestHandoff: result.intent === "unknown" || wantsHuman(latest),
    suggestedActions: result.suggestedActions,
  };
}
