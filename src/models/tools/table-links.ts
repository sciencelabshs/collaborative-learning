import { IObservableArray, observable } from "mobx";

// cf. https://mattferderer.com/use-sass-variables-in-typescript-and-javascript
import styles from "./table-links.scss";

export interface ILinkProperties {
  id: string;
  tileIds: string[];
}

export interface IRowLabel {
  id: string;
  label: string;
}

export interface ITableLinkProperties extends ILinkProperties {
  // labels should be included when adding/removing rows,
  // so that clients can synchronize any label changes
  labels?: IRowLabel[];
}

export function getRowLabelFromLinkProps(links: ITableLinkProperties, rowId: string) {
  const found = links.labels?.find(entry => entry.id === rowId);
  return found?.label;
}

// map from tableId to documentId
const sTableDocumentMap: Map<string, string> = new Map();
type LinkedTableIds = IObservableArray<string>;
// map from documentId to array of linked tableIds
const sDocumentLinkedTables: Map<string, LinkedTableIds> = new Map();

export function getTableDocument(tableId: string) {
  return sTableDocumentMap.get(tableId);
}

export function addTableToDocumentMap(documentId: string, tableId: string) {
  sTableDocumentMap.set(tableId, documentId);
}

export function removeTableFromDocumentMap(tableId: string) {
  sTableDocumentMap.delete(tableId);
}

export function getLinkedTables(documentId: string) {
  return sDocumentLinkedTables.get(documentId);
}

export function getLinkedTableIndex(tableId: string) {
  const documentId = getTableDocument(tableId);
  if (!documentId) return -1;
  const linkedTables = getLinkedTables(documentId);
  return linkedTables ? linkedTables.indexOf(tableId) : -1;
}

export function addLinkedTable(tableId: string) {
  const documentId = getTableDocument(tableId);
  if (!documentId) return;
  const linkedTables = getLinkedTables(documentId);
  if (!linkedTables) {
    sDocumentLinkedTables.set(documentId, observable.array([tableId]));
  }
  else if (linkedTables.indexOf(tableId) < 0) {
    linkedTables.push(tableId);
  }
}

export function removeLinkedTable(tableId: string) {
  const documentId = getTableDocument(tableId);
  if (!documentId) return;
  const linkedTables = getLinkedTables(documentId);
  if (!linkedTables) return;
  const index = linkedTables.indexOf(tableId);
  (index >= 0) && linkedTables.splice(index, 1);
}

export function getTableLinkColors(tableId?: string) {
  const colors = [
          { fill: styles.linkColor0Light, stroke: styles.linkColor0Dark },
          { fill: styles.linkColor1Light, stroke: styles.linkColor1Dark },
          { fill: styles.linkColor2Light, stroke: styles.linkColor2Dark },
          { fill: styles.linkColor3Light, stroke: styles.linkColor3Dark },
          { fill: styles.linkColor4Light, stroke: styles.linkColor4Dark },
          { fill: styles.linkColor5Light, stroke: styles.linkColor5Dark }
        ];
  const linkIndex = tableId ? getLinkedTableIndex(tableId) : -1;
  return linkIndex >= 0
          ? colors[linkIndex % colors.length]
          : undefined;
}
