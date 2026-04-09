export function encodeEmailDocId(email) {
  const normalized = (email ?? "").toString().trim().toLowerCase();
  // Firestore doc IDs cannot contain '/', so use encodeURIComponent to be safe.
  return encodeURIComponent(normalized);
}
