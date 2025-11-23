export function parseSection(text: string, header: string) {
  if (!text) return null;
  const re = new RegExp(`${header}:\\s*([\\s\\S]*?)(?:\\n[A-Z_ ]+:|$)`, 'i');
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}