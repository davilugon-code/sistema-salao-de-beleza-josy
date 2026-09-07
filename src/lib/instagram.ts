/**
 * Utility functions to parse and handle Instagram handles and birthday dates
 */

export function parseInstagram(obs?: string | null, instaCol?: string | null): string {
  if (instaCol && instaCol.trim()) return instaCol.trim();
  if (!obs) return '';
  const match = obs.match(/(?:Instagram|Insta):\s*(@?[\w._]+)/i);
  if (match && match[1]) {
    return match[1].startsWith('@') ? match[1] : `@${match[1]}`;
  }
  return '';
}

export function updateObsWithInstagram(obs: string | null | undefined, instagramInput: string): string {
  const currentObs = obs || '';
  const cleanInsta = instagramInput.trim();
  
  // Remove existing Instagram line if present
  let updated = currentObs.replace(/(?:^|\n)(?:Instagram|Insta):\s*@?[\w._]+/gi, '').trim();
  
  if (cleanInsta) {
    const formattedInsta = cleanInsta.startsWith('@') ? cleanInsta : `@${cleanInsta}`;
    const instaLine = `Instagram: ${formattedInsta}`;
    updated = updated ? `${updated}\n${instaLine}` : instaLine;
  }
  
  return updated;
}
