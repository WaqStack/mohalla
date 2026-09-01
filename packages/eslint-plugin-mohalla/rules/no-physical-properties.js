/**
 * RTL GATE - `no-physical-properties`
 *
 * Fails on physical CSS sides in JS/TS/JSX style objects.
 *
 * WHY THIS IS A BUILD FAILURE AND NOT A WARNING
 *
 * LOCALE-FR-003, BR-041 and REL-002 require the interface to mirror completely
 * for Urdu. A physical property does not mirror. `marginLeft` stays on the left
 * in an RTL layout, so one forgotten `marginLeft` produces an interface that is
 * *almost* mirrored - which is harder to spot in review and worse for the user
 * than one that is obviously broken.
 *
 * A warning would be ignored under delivery pressure. OD-011 committed 68
 * working days and explicitly forbids meeting the schedule by "skipping RTL",
 * so the gate has to be one that cannot be skipped.
 */
const PHYSICAL = new Map([
  ['marginLeft', 'marginInlineStart'],
  ['marginRight', 'marginInlineEnd'],
  ['paddingLeft', 'paddingInlineStart'],
  ['paddingRight', 'paddingInlineEnd'],
  ['borderLeft', 'borderInlineStart'],
  ['borderRight', 'borderInlineEnd'],
  ['borderLeftWidth', 'borderInlineStartWidth'],
  ['borderRightWidth', 'borderInlineEndWidth'],
  ['borderLeftColor', 'borderInlineStartColor'],
  ['borderRightColor', 'borderInlineEndColor'],
  ['borderTopLeftRadius', 'borderStartStartRadius'],
  ['borderTopRightRadius', 'borderStartEndRadius'],
  ['borderBottomLeftRadius', 'borderEndStartRadius'],
  ['borderBottomRightRadius', 'borderEndEndRadius'],
  ['left', 'insetInlineStart'],
  ['right', 'insetInlineEnd'],
]);

/** `text-align: left | right` is equally unmirrored. */
const PHYSICAL_ALIGN = new Set(['left', 'right']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow physical CSS sides so the interface mirrors for Urdu (LOCALE-FR-003, BR-041, REL-002).',
    },
    schema: [],
    messages: {
      physical:
        "'{{name}}' does not mirror in RTL. Use '{{replacement}}'. Required by LOCALE-FR-003 / BR-041 / REL-002.",
      align:
        "text-align: '{{value}}' does not mirror in RTL. Use '{{replacement}}'. Required by LOCALE-FR-003 / BR-041 / REL-002.",
    },
  },

  create(context) {
    return {
      Property(node) {
        const key =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal'
              ? String(node.key.value)
              : null;
        if (!key) return;

        if (PHYSICAL.has(key)) {
          context.report({
            node: node.key,
            messageId: 'physical',
            data: { name: key, replacement: PHYSICAL.get(key) },
          });
          return;
        }

        if (key === 'textAlign' && node.value.type === 'Literal') {
          const v = String(node.value.value);
          if (PHYSICAL_ALIGN.has(v)) {
            context.report({
              node: node.value,
              messageId: 'align',
              data: { value: v, replacement: v === 'left' ? 'start' : 'end' },
            });
          }
        }
      },
    };
  },
};
