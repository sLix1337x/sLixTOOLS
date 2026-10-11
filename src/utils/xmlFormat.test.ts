import { describe, it, expect } from 'vitest';
import { formatXmlString } from './xmlFormat';

describe('formatXmlString', () => {
  it('indents nested elements and keeps the declaration', () => {
    const out = formatXmlString('<?xml version="1.0" encoding="UTF-8"?><a><b><c x="1/2">t</c></b><d/></a>');
    expect(out).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<a>\n  <b>\n    <c x="1/2">t</c>\n  </b>\n  <d/>\n</a>'
    );
  });

  it('leaves CDATA, comments, mixed content and text untouched', () => {
    const out = formatXmlString(
      '<r><s><![CDATA[a><b]]></s><!-- x><y --><p>Hello <b>big</b>  world</p><t>  two  spaces </t></r>'
    );
    expect(out).toBe(
      '<r>\n  <s><![CDATA[a><b]]></s>\n  <!-- x><y -->\n  <p>Hello <b>big</b>  world</p>\n  <t>  two  spaces </t>\n</r>'
    );
  });

  it('does not add namespace declarations and re-indents already formatted input', () => {
    const src = '<r xmlns="urn:x">\n      <a>1</a>\n</r>';
    expect(formatXmlString(src)).toBe('<r xmlns="urn:x">\n  <a>1</a>\n</r>');
  });

  it('throws on malformed XML', () => {
    expect(() => formatXmlString('<a><b></a>')).toThrow();
  });
});
