import escapeStringRegexp from 'escape-string-regexp';
import { Parser } from "expr-eval";
import { kSerializedXKey, kSerializedXKeyRegEx } from "../../../models/tools/table/table-model-types";

export const getEditableExpression = (
  rawExpression: string | undefined, canonicalExpression: string, xName: string
) => {
  // Raw expressions are cleared when x attribute is renamed, in which case
  // we regenerate the "raw" expression from the canonical expression.
  return rawExpression || prettifyExpression(canonicalExpression, xName);
};

export const canonicalizeExpression = (displayExpression: string, xName: string) => {
  if (!displayExpression || !xName) return displayExpression;
  let canonicalExpression = displayExpression.replace(new RegExp(escapeStringRegexp(xName), "g"), kSerializedXKey);
  try {
    const parser = new Parser();
    canonicalExpression = parser.parse(canonicalExpression).toString();
  }
  catch(e) {
    // nop
  }
  return canonicalExpression;
};

export const prettifyExpression = (canonicalExpression: string | undefined, xName: string) => {
  return canonicalExpression && xName
          ? canonicalExpression.replace(kSerializedXKeyRegEx, xName)
          : canonicalExpression;
};

export const validateDisplayExpression = (displayExpression: string, xName: string) => {
  if (!displayExpression || !xName) return;
  const canonicalExpression = canonicalizeExpression(displayExpression, xName);
  const parser = new Parser();
  try {
    const parsed = parser.parse(canonicalExpression);
    const unknownVar = parsed.variables().find(variable => variable !== kSerializedXKey);
    if (unknownVar) {
      return `Unrecognized variable "${unknownVar}" in expression.`;
    }
    // Attempt an evaluation to check for errors e.g. invalid function names
    parsed.evaluate({[kSerializedXKey]: 1});
  } catch {
    return "Could not understand expression. Make sure you supply all operands " +
    "and use a multiplication sign where necessary, e.g. 3 * x + 4 instead of 3x + 4.";
  }
};
