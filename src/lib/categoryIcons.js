export const CATEGORY_EMOJI = {
  All: "📋",
  Work: "💼",
  Health: "🩺",
  Learning: "📚",
  Personal: "🌿",
};

export function emojiFor(category) {
  return CATEGORY_EMOJI[category] || "✦";
}
