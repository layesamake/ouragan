/** Texte brut d'un contenu Lexical (pour la recherche) : tous les nœuds « text », bout à bout. */
export function lexicalToText(content: unknown, max = 20000): string {
  const parts: string[] = []
  let size = 0
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || size > max) return
    const n = node as { text?: unknown; children?: unknown; root?: unknown }
    if (typeof n.text === 'string' && n.text.trim()) {
      parts.push(n.text)
      size += n.text.length + 1
    }
    if (n.root) walk(n.root)
    if (Array.isArray(n.children)) n.children.forEach(walk)
  }
  walk(content)
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Minuscules sans accents : « Sénégal » → « senegal » (recherche insensible aux accents). */
export const foldForSearch = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").toLowerCase()
