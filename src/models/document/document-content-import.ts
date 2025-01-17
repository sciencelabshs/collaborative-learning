import { cloneDeep } from "lodash";
import { getSnapshot } from "mobx-state-tree";
import { ITileModelSnapshotIn } from "../tiles/tile-model";
import { DocumentContentModel, DocumentContentModelType } from "./document-content";
import { INewTileOptions } from "./document-content-types";
import {
  IDocumentImportSnapshot, isOriginalAuthoredTileModel, isOriginalSectionHeaderContent,
  OriginalAuthoredTileModel, OriginalTileModel
} from "./document-content-import-types";

function addImportedTileInNewRow(
          content: DocumentContentModelType,
          tile: OriginalAuthoredTileModel,
          options: INewTileOptions) {
  const id = tile.id || content.getNextTileId(tile.content.type);
  const tileSnapshot = { id, ...tile };
  return content.addTileSnapshotInNewRow(tileSnapshot as ITileModelSnapshotIn, options);
}

function addImportedTileInExistingRow(
          content: DocumentContentModelType,
          tile: OriginalAuthoredTileModel,
          options: INewTileOptions) {
  const id = tile.id || content.getNextTileId(tile.content.type);
  const tileSnapshot = { id, ...tile };
  return content.addTileSnapshotInExistingRow(tileSnapshot as ITileModelSnapshotIn, options);
}

function migrateTile(content: DocumentContentModelType, tile: OriginalTileModel) {
  const { layout, ...newTile } = cloneDeep(tile);
  const tileHeight = layout?.height;
  if (isOriginalSectionHeaderContent(newTile.content)) {
    const { sectionId } = newTile.content;
    content.setImportContext(sectionId);
    content.addSectionHeaderRow(sectionId);
  }
  else if (isOriginalAuthoredTileModel(newTile)) {
    addImportedTileInNewRow(content, newTile, { rowIndex: content.rowCount, rowHeight: tileHeight });
  }
}

function migrateRow(content: DocumentContentModelType, tiles: OriginalTileModel[]) {
  let insertRowIndex = content.rowCount;
  tiles.forEach((tile, tileIndex) => {
    const { layout, ...newTile } = cloneDeep(tile);
    const tileHeight = layout?.height;
    const options = { rowIndex: insertRowIndex, rowHeight: tileHeight };
    if (isOriginalAuthoredTileModel(newTile)) {
      if (tileIndex === 0) {
        const newRowInfo = addImportedTileInNewRow(content, newTile, options);
        const newRowIndex = content.getRowIndex(newRowInfo.rowId);
        (newRowIndex >= 0) && (insertRowIndex = newRowIndex);
      }
      else {
        addImportedTileInExistingRow(content, newTile, options);
      }
    }
  });
}

export function migrateSnapshot(snapshot: IDocumentImportSnapshot): any {
  const docContent = DocumentContentModel.create();
  const { tiles: tilesOrRows, sharedModels } = snapshot;
  tilesOrRows.forEach(tileOrRow => {
    if (Array.isArray(tileOrRow)) {
      migrateRow(docContent, tileOrRow);
    }
    else {
      migrateTile(docContent, tileOrRow);
    }
  });

  sharedModels?.forEach((entry) => {
    const id = entry.sharedModel.id;
    if (!id) {
      console.warn("cannot import a shared model without an id", entry.sharedModel);
      return;
    }
    docContent.addSharedModelFromImport(id, entry);
  });

  return getSnapshot(docContent);
}
