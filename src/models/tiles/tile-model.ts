import { cloneDeep } from "lodash";
import { getParent, getSnapshot, getType,
  Instance, SnapshotIn, SnapshotOut, types, ISerializedActionCall } from "mobx-state-tree";
import { isPlaceholderContent } from "./placeholder/placeholder-content";
import { getTileContentInfo, ITileExportOptions } from "./tile-content-info";
import { findMetadata, ITileContentModel, TileContentUnion } from "./tile-types";
import { DisplayUserTypeEnum } from "../stores/user-types";
import { uniqueId } from "../../utilities/js-utils";
import { StringBuilder } from "../../utilities/string-builder";

// generally negotiated with app, e.g. single column width for table
export const kDefaultMinWidth = 60;

export interface IDragTileItem {
  rowIndex: number;
  rowHeight?: number;
  tileIndex: number;
  tileId: string;       // original tile id
  tileContent: string;  // modified tile contents
  tileType: string;
}

export interface IDragTiles {
  sourceDocId: string;
  items: IDragTileItem[];
}

export function cloneTileSnapshotWithoutId(tile: ITileModel) {
  const { id, display, ...copy } = cloneDeep(getSnapshot(tile));
  return copy;
}

export function cloneTileSnapshotWithNewId(tile: ITileModel, newId?: string) {
  const content = tile.content.tileSnapshotForCopy;
  const { id, display, ...copy } = cloneDeep(getSnapshot(tile));
  return { id: newId || uniqueId(), ...copy, content };
}

export function getTileModel(tileContentModel: ITileContentModel) {
  try {
    const parent = getParent(tileContentModel);
    return getType(parent).name === "TileModel" ? parent as ITileModel : undefined;
  } catch (e) {
    console.warn(`Unable to find tile model for content ${tileContentModel}`);
    return undefined;
  }
}

export function getTileTitleFromContent(tileContentModel: ITileContentModel) {
  return getTileModel(tileContentModel)?.title;
}

export function setTileTitleFromContent(tileContentModel: ITileContentModel, title: string) {
  getTileModel(tileContentModel)?.setTitle(title);
}

export const TileModel = types
  .model("TileModel", {
    // if not provided, will be generated
    id: types.optional(types.identifier, () => uniqueId()),
    // all tiles can have a title
    title: types.maybe(types.string),
    // whether to restrict display to certain users
    display: DisplayUserTypeEnum,
    // e.g. "TextContentModel", ...
    content: TileContentUnion
  })
  .preProcessSnapshot(snapshot => {
    const tileType = snapshot.content.type;
    const preProcessor = getTileContentInfo(tileType)?.tileSnapshotPreProcessor;
    return preProcessor ? preProcessor(snapshot) : snapshot;
  })
  .views(self => ({
    // generally negotiated with tile, e.g. single column width for table
    get minWidth() {
      return kDefaultMinWidth;
    },
    // undefined by default, but can be negotiated with app,
    // e.g. width of all columns for table
    get maxWidth(): number | undefined {
      // eslint-disable-next-line no-useless-return
      return;
    },
    get isUserResizable() {
      return !!(self.content as any).isUserResizable;
    },
    get isPlaceholder() {
      return isPlaceholderContent(self.content);
    },
    get placeholderSectionId() {
      return isPlaceholderContent(self.content) ? (self.content).sectionId : undefined;
    },
    exportJson(options?: ITileExportOptions): string | undefined {
      const { includeId, excludeTitle, ...otherOptions } = options || {};
      let contentJson = (self.content as any).exportJson(otherOptions);
      if (!contentJson) return;
      if (options?.rowHeight) {
        // add comma before layout/height entry
        contentJson = contentJson[contentJson.length - 1] === "\n"
                ? `${contentJson.slice(0, contentJson.length - 1)},\n`
                : `${contentJson},`;
      }

      const builder = new StringBuilder();
      builder.pushLine("{");
      if (includeId) {
        builder.pushLine(`"id": "${self.id}",`, 2);
      }
      if (!excludeTitle && self.title) {
        builder.pushLine(`"title": "${self.title}",`, 2);
      }
      builder.pushBlock(`"content": ${contentJson}`, 2);
      options?.rowHeight && builder.pushLine(`"layout": { "height": ${options.rowHeight} }`, 2);
      builder.pushLine(`}`);
      return builder.build();
    }
  }))
  .actions(self => ({
    setTitle(title: string) {
      self.title = title;
    }
  }))
  .actions(self => ({
    afterCreate() {
      const metadata = findMetadata(self.content.type, self.id);
      const content = self.content;
      if (metadata && content.doPostCreate) {
        content.doPostCreate(metadata);
      }
    },
    onTileAction(call: ISerializedActionCall) {
      self.content.onTileAction?.(call);
    },
    willRemoveFromDocument() {
      return self.content.willRemoveFromDocument?.();
    },
    setDisabledFeatures(disabled: string[]) {
      const metadata: any = findMetadata(self.content.type, self.id);
      metadata && metadata.setDisabledFeatures && metadata.setDisabledFeatures(disabled);
    }
  }));

export interface ITileModel extends Instance<typeof TileModel> {}
export interface ITileModelSnapshotIn extends SnapshotIn<typeof TileModel> {}
export interface ITileModelSnapshotOut extends SnapshotOut<typeof TileModel> {}