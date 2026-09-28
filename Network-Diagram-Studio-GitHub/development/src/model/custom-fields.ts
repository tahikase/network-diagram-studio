/**
 * Custom field keys vs. custom field NAMES.
 *
 * `node.data.fields` is a `Record<string, string>`, so two entries can never
 * share a storage key. A node can nonetheless legitimately want to SHOW the
 * same name twice — a DNS server with two "IP address" rows is the obvious
 * case, and that already happens today whenever a type-defined field (key
 * `ip`, label "IP address") sits next to a custom field the user named
 * "IP address".
 *
 * The panel used to refuse the second one outright, disabling **Add** with
 * "Field name already exists." That conflated the two concepts: uniqueness is
 * a storage requirement, not a naming rule.
 *
 * So a duplicate name is stored under a disambiguated key and the marker is
 * stripped everywhere the name is shown. `\u0001` is used because it is a
 * control character: it cannot be typed into the input, it survives a JSON
 * round trip (encoded as `\u0001`), and it can never collide with a name a
 * user would actually choose — unlike a `#2` or ` (2)` suffix, which would
 * corrupt a field genuinely named "Item #2".
 */
const DUP_MARK = '\u0001';

/** The name to DISPLAY for a stored custom-field key. */
export function customFieldLabel(key: string): string {
  const i = key.indexOf(DUP_MARK);
  return i === -1 ? key : key.slice(0, i);
}

/** True when `key` carries a duplicate-disambiguation marker. */
export function isDuplicateFieldKey(key: string): boolean {
  return key.includes(DUP_MARK);
}

/**
 * A free storage key for `label`, given the keys already on the node.
 * Returns `label` itself when it is not taken, so the common case stores
 * exactly what the user typed.
 */
export function uniqueCustomFieldKey(
  label: string,
  existing: Iterable<string>
): string {
  const taken = new Set(existing);
  if (!taken.has(label)) return label;
  for (let n = 2; n < 500; n++) {
    const candidate = `${label}${DUP_MARK}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${label}${DUP_MARK}${Date.now()}`;
}
