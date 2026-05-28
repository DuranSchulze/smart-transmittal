/**
 * Converts raw technical errors into plain, user-friendly messages.
 * Pass the caught error as `err` and an optional `fallback` that
 * describes what the user was trying to do.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = (
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : ""
  ).toLowerCase();

  if (!raw) return fallback;

  // Session / auth
  if (/not authenticated|unauthorized|session expired|401/.test(raw))
    return "Your session has expired. Please sign in again.";

  // Network / connectivity
  if (/fetch failed|failed to fetch|network|econnreset|enotfound|eai_again|timeout|aborted|abort/.test(raw))
    return "Couldn't reach the server. Check your internet connection and try again.";

  // Gemini / AI key
  if (/not configured|missing.*key|api.?key|gemini|quota|rate.?limit|resource.*exhausted|429/.test(raw))
    return "The AI service couldn't run. Go to File → AI Key Settings and make sure your Gemini API key is set correctly.";

  // File too large
  if (/too large|content.*large|413/.test(raw))
    return "That file is too large to process. Try a smaller or compressed version.";

  // Empty / unreadable file
  if (/empty content|no text|empty/.test(raw))
    return "The file appears to be empty or couldn't be read. Try a different file.";

  // Duplicate transmittal number
  if (/already in use|duplicate|unique constraint/.test(raw))
    return "That transmittal number is already taken. Please use a different one.";

  // Not found
  if (/not found|404/.test(raw))
    return "The item you're looking for couldn't be found. It may have been deleted.";

  // Permission / access denied
  if (/permission|forbidden|403|access denied/.test(raw))
    return "You don't have permission to do that. Try signing out and back in.";

  // Database / server internals
  if (/prisma|database|column|sql|p\d{4}/.test(raw))
    return "A server error occurred. Please refresh the page and try again.";

  // Google Drive / OAuth
  if (/drive|oauth|token.*invalid|invalid.*token|google/.test(raw))
    return "Google Drive isn't connected properly. Try signing out and back in.";

  // Docx extraction
  if (/word document|docx|mammoth/.test(raw))
    return "Couldn't read that Word document. Make sure it's a valid .docx file.";

  return fallback;
}
