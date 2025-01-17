import { uniqueId } from "../../utilities/js-utils";
import { cloneTileSnapshotWithNewId, IDragTileItem, ITilePosition } from "../tiles/tile-model";
import { IDragTilesData } from "./document-content-types";
import { getTileContentInfo } from "../tiles/tile-content-info";
import { DEBUG_DROP } from "../../lib/debug";
import { BaseDocumentContentModel } from "./base-document-content";

/**
 * This is one part of the DocumentContentModel. The other part is
 * BaseDocumentContentModel. It was split out to reduce the size of the
 * DocumentContentModel.
 *
 * This file should contain the any properties, views, and actions that are
 * related to dragging and dropping tiles.
 *
 * TODO: move tile dropping actions from BaseDocumentContentModel here TODO:
 * consider extending this to include tile copying since that is fundamental
 * part of dragging and dropping.
 */
export const DocumentContentModelWithTileDragging = BaseDocumentContentModel
.named("DocumentContentModelWithTileDragging")
.views(self => ({
  getTilePositions(tileIds: string[]) {
    return tileIds.map(tileId => {
      const rowId = self.findRowContainingTile(tileId);
      const rowIndex = rowId && self.getRowIndex(rowId) || 0;
      const row = rowId ? self.getRow(rowId) : undefined;
      const tileIndex = row?.tiles.findIndex(t => t.tileId === tileId) || 0;
      return { tileId, rowIndex, row, tileIndex };
    });
  }
}))
.views(self => ({
  getDragTileItems(tileIds: string[]) {
    const dragTileItems: IDragTileItem[] = [];

    const idMap: { [id: string]: string } = {};
    tileIds.forEach(tileId => idMap[tileId] = uniqueId());

    const tilePositions = self.getTilePositions(tileIds);

    tilePositions.forEach(({ tileId, rowIndex, row, tileIndex }) => {
      // Note: previously this function would be passed the tileModel being
      // dragged. It would accept a tileId if it matched the tileModel.id even if
      // `documentContent.getTile(tileId)` did not return a tile model. This seems
      // like it would mask an error and also complicates the code.
      const srcTile = self.getTile(tileId);
      if (!srcTile) {
        return;
      }

      // Note: previously this would look up the "contentId" of the srcTile using
      // `getContentIdFromNode`. If it didn't exist or was different from
      // `documentContent.contentId` the tile would be skipped. This contentId is
      // found by looking up the contentDocument parent of the tile and getting is
      // `contentId`. Because srcTile is found via `documentContent.getTile` this
      // should guarantee that the contentId return by `getContentIdFromNode`
      // always matches the dragSrcContentId.
      const rowHeight = row?.height;
      const clonedTile = cloneTileSnapshotWithNewId(srcTile, idMap[srcTile.id]);
      getTileContentInfo(clonedTile.content.type)?.contentSnapshotPostProcessor?.(clonedTile.content, idMap);
      dragTileItems.push({
        rowIndex, rowHeight, tileIndex,
        tileId: srcTile.id,
        tileContent: JSON.stringify(clonedTile),
        tileType: srcTile.content.type
      });
    });

    return dragTileItems;
  }
}))
.views(self => ({
  /**
   *
   * @param documentContent
   * @param tileIds
   * @returns
   */
  getDragTiles(tileIds: string[]): IDragTilesData {

    const sharedManager = self.tileEnv?.sharedModelManager;

    // This is an ephemeral id DocumentContent#contentId
    // it is like an instance id for the document content it
    // will change on each load of the document
    const sourceDocId = self.contentId;

    const dragTiles: IDragTilesData = {
      sourceDocId,
      tiles: self.getDragTileItems(tileIds),
      sharedModels: sharedManager?.getSharedModelDragDataForTiles(tileIds) ?? []
    };

    // create a sorted array of selected tiles
    orderTilePositions(dragTiles.tiles);

    return dragTiles;
  }
}));


// Sorts the given tile positions in top->bottom, left->right order IN PLACE!
export function orderTilePositions(tilePositions: ITilePosition[]) {
  tilePositions.sort((a, b) => {
    if (a.rowIndex < b.rowIndex) return -1;
    if (a.rowIndex > b.rowIndex) return 1;
    if (a.tileIndex < b.tileIndex) return -1;
    if (a.tileIndex > b.tileIndex) return 1;
    return 0;
  });
  return tilePositions;
}

/* istanbul ignore next: this only used for debugging */
export function logDataTransfer(_dataTransfer: DataTransfer) {
  if (!DEBUG_DROP) {
    return;
  }

  const dataTransfer = {} as any;
  dataTransfer.dropEffect = _dataTransfer.dropEffect;
  dataTransfer.effectAllowed = _dataTransfer.effectAllowed;
  dataTransfer.types = _dataTransfer.types.map(type => type);

  dataTransfer.items = {} as any;
  for (const _item of _dataTransfer.items) {
    const item = {
      kind: _item.kind,
      type: _item.type,
      stringValue: undefined as string | undefined
    };
    // This is asynchronous, however Chrome's console.log will update any objects printed to console
    // if it is changed after being logged. However you have to ask for all of the values "synchronously"
    // otherwise the browser clears out the dataTransfer and any delayed requests will return nothing.
    // In other words doing an `await` between each getAsString call will fail.
    //
    // Because the incoming _dataTransfer.items are cleared out after this function returns
    // _item.type will become undefined or an empty string after the function returns
    // So we have to make sure not to refer `_item` in the asynchronous callback below.
    _item.getAsString((value) => item.stringValue = value);

    dataTransfer.items[item.type] = item;
  }

  // As far as I can tell getData(type) is the same as the value passed to callback of getAsString
  dataTransfer.dataValues = {} as Record<string,string>;
  for (const type of dataTransfer.types) {
    dataTransfer.dataValues[type] = _dataTransfer.getData(type);
  }

  // eslint-disable-next-line no-console
  console.log("Dropped", dataTransfer);
}
