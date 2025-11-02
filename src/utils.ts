export function isPossibleIdentifier(text: string): boolean {
  const p = text.slice(0, 3);
  return p === "978" || p === "979" || p === "977";
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
