/** Escape text for HTML and turn [label](https://url) into links. Used for the bio only. */
export function inlineHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return text
    .split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
    .map((part) => {
      const m = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      return m ? `<a href="${esc(m[2]!)}">${esc(m[1]!)}</a>` : esc(part);
    })
    .join('');
}
