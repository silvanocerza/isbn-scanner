export function isValidISBN(text: string): boolean {
  const cleaned = text.replace(/[-\s]/g, "");

  // ISBN-10
  if (cleaned.length === 10) {
    if (!/^\d{9}[\dX]$/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (10 - i) * parseInt(cleaned[i], 10);
    }
    sum += cleaned[9] === "X" ? 10 : parseInt(cleaned[9], 10);
    return sum % 11 === 0;
  }

  // ISBN-13
  if (cleaned.length === 13) {
    if (!/^\d{13}$/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(cleaned[i], 10);
    }
    return sum % 10 === 0;
  }

  return false;
}
