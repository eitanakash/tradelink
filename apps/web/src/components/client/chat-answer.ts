export function resolveChatAnswer(typedAnswer: string, quickAnswer?: string): string {
  return quickAnswer?.trim() || typedAnswer.trim()
}
