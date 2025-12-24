export function isISBN(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, "");

  if (digits.length === 10) {
    return validateISBN10(digits);
  } else if (digits.length === 13) {
    return validateISBN13(digits);
  }

  return false;
}

function validateISBN10(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  return sum % 11 === 0;
}

function validateISBN13(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return parseInt(digits[12]) === checkDigit;
}

export function isEAN13(identifier: string): boolean {
  const digits = identifier.replace(/\D/g, "");
  if (digits.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return parseInt(digits[12]) === checkDigit;
}

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const GROUP_COLORS = [
  "bg-blue-400/40 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200",
  "bg-purple-400/40 dark:bg-purple-500/30 text-purple-700 dark:text-purple-200",
  "bg-pink-400/40 dark:bg-pink-500/30 text-pink-700 dark:text-pink-200",
  "bg-green-400/40 dark:bg-green-500/30 text-green-700 dark:text-green-200",
  "bg-yellow-400/40 dark:bg-yellow-500/30 text-yellow-700 dark:text-yellow-200",
  "bg-red-400/40 dark:bg-red-500/30 text-red-700 dark:text-red-200",
  "bg-indigo-400/40 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200",
  "bg-orange-400/40 dark:bg-orange-500/30 text-orange-700 dark:text-orange-200",
];

export function getColorForGroup(group: string): string {
  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = (hash << 5) - hash + group.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % GROUP_COLORS.length;
  return GROUP_COLORS[index];
}
