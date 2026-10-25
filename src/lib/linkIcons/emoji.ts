// Um único emoji, inclusive sequências com ZWJ, tons de pele e bandeiras.
// Limitações aceitas: keycaps (dígito + U+FE0F + U+20E3) são recusados nos dois caminhos;
// ©, ®, ™ e ‼ passam, porque são Extended_Pictographic.
// ZWJ e seletores de variação ficam como escapes \u{...}: nada de caractere invisível no código.

const MAX_LENGTH = 32;
const HAS_EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const ZWJ = '\u{200D}';
// Seletores de variação (VS15, VS16), tons de pele e tags (bandeiras por subdivisão)
const MODIFIERS_RE = /[\u{FE0E}\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/gu;
const PICTOGRAPHIC_RE = /^\p{Extended_Pictographic}$/u;
const REGIONAL_INDICATOR_RE = /^\p{Regional_Indicator}$/u;

// Sem Intl.Segmenter (Firefox ESR 115): confere a sequência parte por parte.
function isSingleEmojiWithoutSegmenter(text: string): boolean {
  const codePoints = Array.from(text);
  if (
    !text.includes(ZWJ) &&
    codePoints.length === 2 &&
    codePoints.every((codePoint) => REGIONAL_INDICATOR_RE.test(codePoint))
  ) {
    return true;
  }

  const parts = text.split(ZWJ);
  if (parts.length < 1 || parts.length > 8) return false;
  return parts.every((part) => {
    const rest = Array.from(part.replace(MODIFIERS_RE, ''));
    return rest.length === 1 && PICTOGRAPHIC_RE.test(rest[0]);
  });
}

export function isSingleEmoji(text: string): boolean {
  if (typeof text !== 'string' || !text) return false;
  if (text !== text.trim() || text.length > MAX_LENGTH) return false;
  if (!HAS_EMOJI_RE.test(text)) return false;

  // Lido na chamada: o lib ES2020 do projeto não tipa o Segmenter, e os testes o apagam
  const Segmenter = (Intl as any).Segmenter;
  if (typeof Segmenter === 'function') {
    const segments = Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(text));
    return segments.length === 1;
  }
  return isSingleEmojiWithoutSegmenter(text);
}
