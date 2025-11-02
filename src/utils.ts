export function isISBN(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 13;
}

export function isISSN(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, "");
  return digits.length === 8 || digits.length > 8;
}

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
