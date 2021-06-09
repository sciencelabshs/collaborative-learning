import { nanoid } from "nanoid";

/*
 * comma(condition: boolean)
 *
 * utility function for building JSON strings; returns "," or "" depending on its argument
 */
export const comma = (condition: boolean) => condition ? "," : "";

/*
 * castArrayCopy()
 *
 * returns an array for simple items, and a copy of the array for arrays
 */
export function castArrayCopy(itemOrArray: any) {
  return Array.isArray(itemOrArray)
          ? itemOrArray.slice()
          : [itemOrArray];
}

/*
 * safeDecodeURI()
 *
 * returns the original string on error rather than throwing an exception
 */
export function safeDecodeURI(uriOrComponent: string) {
  let decoded: string | undefined;
  try {
    decoded = decodeURIComponent(uriOrComponent);
  }
  catch (e) {
    // swallow errors
  }
  return decoded || uriOrComponent;
}

/*
 * safeJsonParse()
 *
 * returns undefined on error rather than throwing an exception
 */
export function safeJsonParse<T = any>(json?: string) {
  let parsed;
  try {
    parsed = json ? JSON.parse(json) as T: undefined;
  }
  catch (e) {
    // swallow errors
  }
  return parsed;
}

/*
 * uniqueId()
 *
 * returns a unique id string
 */
export function uniqueId(idLength = 16): string {
  // cf. https://zelark.github.io/nano-id-cc/
  return nanoid(idLength);
}

/*
 * uniqueTitle()
 *
 * returns a unique title from a given base name, adding a unique numeric suffix
 */
export function uniqueTitle(base: string, isValid: (name: string) => boolean) {
  let name: string;
  for (let i = 1; !isValid(name = `${base} ${i}`); ++i) {
    // nothing to do
  }
  return name;
}

/*
 * uniqueName()
 *
 * returns a unique name from a given base name, adding a numeric suffix if necessary
 */
export function uniqueName(base: string, isValid: (name: string) => boolean) {
  if (isValid(base)) return base;
  let name: string;
  for (let i = 2; !isValid(name = `${base}${i}`); ++i) {
    // nothing to do
  }
  return name;
}

/*
 * uniqueSubscriptedName()
 *
 * returns a unique name from a given base name, adding subscripts if necessary
 */
export function uniqueSubscriptedName(base: string, isValid: (name: string) => boolean) {
  if (isValid(base)) return base;
  const numToSubscripts = (num: number) => {
    const subscripts = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
    const str = `${Math.trunc(num)}`;
    let result = "";
    for (let i = 0; i < str.length; ++i) {
      result += subscripts[str.charCodeAt(i) - "0".charCodeAt(0)];
    }
    return result;
  };
  let name: string;
  for (let i = 2; !isValid(name = `${base}${numToSubscripts(i)}`); ++i) {
    // nothing to do
  }
  return name;
}
