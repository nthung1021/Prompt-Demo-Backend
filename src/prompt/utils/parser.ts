export function parseSection(text: string, header: string) {
  if (!text) return null;
  
  // More precise regex to match section headers and stop at next section
  const sectionPattern = new RegExp(`${header}:\\s*\\n?([\\s\\S]*?)(?=\\n(?:INITIAL_ATTEMPT|REFLECTION_\\d+|REVISED_SOLUTION_\\d+|FINAL_ANSWER):|$)`, 'i');
  const match = text.match(sectionPattern);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback to original logic if the new pattern doesn't work
  const fallbackPattern = new RegExp(`${header}:\\s*([\\s\\S]*?)(?:\\n[A-Z_]+:|$)`, 'i');
  const fallbackMatch = text.match(fallbackPattern);
  return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1].trim() : null;
}