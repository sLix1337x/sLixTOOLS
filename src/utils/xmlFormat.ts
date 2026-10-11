const escapeAttr = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#9;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');

const isText = (n: Node) =>
  n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE;

/**
 * Pretty-prints an XML string with 2-space indentation.
 * Text, CDATA, comments, mixed content and xml:space="preserve" subtrees are
 * emitted unchanged; only whitespace between element-only children is rewritten.
 * Throws if the input is not well-formed.
 */
export function formatXmlString(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');

  const serializer = new XMLSerializer();

  const ser = (n: Node, depth: number, inline: boolean): string => {
    const pad = inline ? '' : '  '.repeat(depth);
    if (n.nodeType !== Node.ELEMENT_NODE) return pad + serializer.serializeToString(n);

    const el = n as Element;
    const open =
      '<' +
      el.tagName +
      Array.from(el.attributes)
        .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
        .join('');
    const kids = Array.from(el.childNodes);
    if (kids.length === 0) return `${pad}${open}/>`;

    const keepAsIs =
      inline ||
      el.getAttribute('xml:space') === 'preserve' ||
      kids.every(isText) ||
      kids.some((k) => isText(k) && (k.nodeValue ?? '').trim() !== '');
    if (keepAsIs) {
      return `${pad}${open}>${kids.map((k) => ser(k, 0, true)).join('')}</${el.tagName}>`;
    }

    const body = kids
      .filter((k) => !(k.nodeType === Node.TEXT_NODE && !(k.nodeValue ?? '').trim()))
      .map((k) => ser(k, depth + 1, false))
      .join('\n');
    return `${pad}${open}>\n${body}\n${pad}</${el.tagName}>`;
  };

  // The DOM drops the <?xml ...?> declaration; carry it over from the source.
  const decl = xml.match(/^\s*(<\?xml[\s\S]*?\?>)/)?.[1];
  const top = Array.from(doc.childNodes).map((n) => ser(n, 0, false));
  return (decl ? [decl, ...top] : top).join('\n');
}
