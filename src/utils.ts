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
