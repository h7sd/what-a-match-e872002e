/**
 * Masks an email address for privacy display
 * Example: "username@gmail.com" -> "us***@gmail.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const atIndex = email.indexOf('@');
  if (atIndex <= 2) {
    // For very short local parts, just show first char
    return email.replace(/(.{1})(.*)(@.*)/, '$1***$3');
  }
  
  // Show first 2 characters, then ***, then domain
  return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
}
