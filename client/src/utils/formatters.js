/**
 * Utility function to format person names according to EYD / Proper Title Case capitalization.
 * Automatically capitalizes the first letter of each word and converts remaining letters to lowercase.
 * Preserves trailing spaces during typing so multi-word names can be typed naturally.
 *
 * Example:
 *  "ilman" -> "Ilman"
 *  "ilman pangeraN" -> "Ilman Pangeran"
 *  "dr. siti nurhaliza, sp.kk" -> "Dr. Siti Nurhaliza, Sp.Kk"
 */
export function formatPersonName(value) {
  if (!value) return '';
  return value.replace(/\b([a-zA-ZÀ-ÿ])([a-zA-ZÀ-ÿ]*)/g, (match, firstLetter, restOfWord) => {
    return firstLetter.toUpperCase() + restOfWord.toLowerCase();
  });
}
