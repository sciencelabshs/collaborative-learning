import { types, Instance, SnapshotIn, SnapshotOut } from "mobx-state-tree";
import { ToolTileModelType } from "../tiles/tile-model";
import { IDropRowInfo } from "../document/document-content";
import { uniqueId } from "../../utilities/js-utils";
import { withoutUndo } from "../history/tree-monitor";

export const TileLayoutModel = types
  .model("TileLayout", {
    tileId: types.string,
    widthPct: types.maybe(types.number)
  })
  .volatile(self => ({
    isUserResizable: false
  }))
  .actions(self => ({
    setWidthpct(widthPct?: number) {
      self.widthPct = widthPct;
    },
    setUserResizable(isUserResizable: boolean) {
      self.isUserResizable = isUserResizable;
    }
  }));
export type TileLayoutModelType = Instance<typeof TileLayoutModel>;

export const TileRowModel = types
  .model("TileRow", {
    id: types.optional(types.identifier, () => uniqueId()),
    height: types.maybe(types.number),
    isSectionHeader: false,
    sectionId: types.maybe(types.string),
    tiles: types.array(TileLayoutModel)
  })
  .views(self => ({
    get isEmpty() {
      return (self.tiles.length === 0) && !self.isSectionHeader;
    },
    get tileCount() {
      return self.tiles.length;
    },
    get isUserResizable() {
      return !self.isSectionHeader && self.tiles.some(tileRef => tileRef.isUserResizable);
    },
    get tileIds() {
      return self.tiles.map(tile => tile.tileId).join(", ");
    },
    acceptTileDrop(rowInfo: IDropRowInfo) {
      const rowDropLocation = rowInfo.rowDropLocation;
      return !self.isSectionHeader && ((rowDropLocation === "left") || (rowDropLocation === "right"));
    },
    getTileIdAtIndex(index: number) {
      const layout = (index >= 0) && (index < self.tiles.length) ? self.tiles[index] : undefined;
      return layout && layout.tileId;
    },
    hasTile(tileId: string) {
      return self.tiles.findIndex(tileRef => tileRef.tileId === tileId) >= 0;
    },
    indexOfTile(tileId: string) {
      return self.tiles.findIndex(tileRef => tileRef.tileId === tileId);
    },
    getContentHeight(getTileHeight?: (tileId: string) => number | undefined) {
      let rowHeight: number | undefined;
      self.tiles.forEach(tileInfo => {
        const tileHeight = getTileHeight?.(tileInfo.tileId);
        tileHeight && (rowHeight = Math.max(tileHeight, rowHeight || 0));
      });
      return rowHeight;
    }
  }))
  .actions(self => ({
    updateLayout(tileMap: any) {
      self.tiles.forEach(tileRef => {
        const tile: ToolTileModelType = tileMap.get(tileRef.tileId);
        if (tile) {
          tileRef.setUserResizable(tile.isUserResizable);
        }
      });
    },
    // undefined height == default to content height
    setRowHeight(height?: number) {
      self.height = height;
    },
    setSectionHeader(sectionId: string) {
      self.isSectionHeader = true;
      self.sectionId = sectionId;
    },
    insertTileInRow(tile: ToolTileModelType, tileIndex?: number) {
      const dstTileIndex = (tileIndex != null) && (tileIndex >= 0) && (tileIndex < self.tiles.length)
                            ? tileIndex
                            : self.tiles.length;
      const tileRef = TileLayoutModel.create({ tileId: tile.id });
      tileRef.setUserResizable(tile.isUserResizable);
      self.tiles.splice(dstTileIndex, 0, tileRef);
    },
    moveTileInRow(tileId: string, fromTileIndex: number, toTileIndex: number) {
      const dstTileIndex = fromTileIndex < toTileIndex ? toTileIndex - 1 : toTileIndex;
      const tileIds = self.tiles.map(tileRef => tileRef.tileId);
      tileIds.splice(fromTileIndex, 1);
      tileIds.splice(dstTileIndex, 0, tileId);
      const tileIndexMap: { [id: string]: number } = {};
      tileIds.forEach((id, index) => { tileIndexMap[id] = index; });
      const compareFunc = (tileRef1: TileLayoutModelType, tileRef2: TileLayoutModelType) =>
                            tileIndexMap[tileRef1.tileId] - tileIndexMap[tileRef2.tileId];
      const sortedTiles = self.tiles.slice().sort(compareFunc);
      self.tiles.replace(sortedTiles);
    },
    removeTileFromRow(tileId: string) {
      self.tiles.replace(self.tiles.filter(tile => tile.tileId !== tileId));
      if (!self.isUserResizable) {
        self.height = undefined;
      }
    },
    removeTilesFromRow(removeFn: (tileId: string) => boolean) {
      self.tiles.replace(self.tiles.filter(tile => !removeFn(tile.tileId)));
      if (!self.isUserResizable) {
        self.height = undefined;
      }
    }
  }))
  .actions(self => ({
    setRowHeightWithoutUndo(height?: number) {
      withoutUndo();
      self.setRowHeight(height);
    }
  }));

export type TileRowModelType = Instance<typeof TileRowModel>;
export type TileRowSnapshotType = SnapshotIn<typeof TileRowModel>;
export type TileRowSnapshotOutType = SnapshotOut<typeof TileRowModel>;
