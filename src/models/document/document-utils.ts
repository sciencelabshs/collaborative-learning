import { getParent } from "mobx-state-tree";
import { ProblemModelType } from "../curriculum/problem";
import { SectionModelType } from "../curriculum/section";
import { getSectionPath } from "../curriculum/unit";
import { AppConfigModelType } from "../stores/app-config-model";
import { DocumentModelType } from "./document";
import { DocumentContentModelType } from "./document-content";
import { isPlanningType, isProblemType } from "./document-types";

export function getDocumentDisplayTitle(
  document: DocumentModelType, appConfig: AppConfigModelType, problem: ProblemModelType
) {
  const { type } = document;
  return document.isSupport
    ? document.getProperty("caption") || "Support"
    : isProblemType(type)
        ? problem.title
        : isPlanningType(type)
            ? `${problem.title}: Planning`
            : document.getDisplayTitle(appConfig);
}

/**
 * Returns the key for user documents or path for problem documents
 * @param document 
 * @returns 
 */
export function getDocumentIdentifier(document?: DocumentContentModelType) {
  if (!document) {
    return undefined;
  }
  
  const parent = getParent(document);
  if (Object.hasOwn(parent, "key")) {
    return (parent as DocumentModelType).key;
  } else {
    const section = parent as SectionModelType;
    return getSectionPath(section);
  }
}
