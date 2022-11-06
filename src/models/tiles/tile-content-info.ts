import { TileMetadataModel } from "./tile-metadata";
import { TileContentModel, ITileContentModel } from "./tile-types";
import { AppConfigModelType } from "../stores/app-config-model";

export interface IDMap {
  [id: string]: string;
}
export type TileContentModelSnapshotPostProcessor =
              (content: any, idMap: IDMap, asTemplate?: boolean) => any;

export interface IDefaultContentOptions {
  // title is only currently used by the Geometry and Table tiles
  title?: string;
  // url is added so the CLUE core can add an image tile to the document when a user
  // drops an image on the document.
  url?: string;
  // appConfig contains stamps (for drawing tool), placeholderText (for text tool), etc.
  appConfig?: AppConfigModelType;
}

export interface ITileContentInfo {
  type: string;
  modelClass: typeof TileContentModel;
  defaultContent: (options?: IDefaultContentOptions) => ITileContentModel;
  titleBase?: string;
  metadataClass?: typeof TileMetadataModel;
  addSidecarNotes?: boolean;
  defaultHeight?: number;
  exportNonDefaultHeight?: boolean;
  snapshotPostProcessor?: TileContentModelSnapshotPostProcessor;
}

const gTileContentInfoMap: Record<string, ITileContentInfo> = {};

export function registerTileContentInfo(tileContentInfo: ITileContentInfo) {
  // toLowerCase() for legacy support of tool names
  gTileContentInfoMap[tileContentInfo.type.toLowerCase()] = tileContentInfo;
}

// ToolContent type, e.g. kDrawingTileType, kGeometryTileType, etc.
// undefined is supported so callers do not need to check the id before passing
// it in.
export function getTileContentInfo(type?: string) {
  // toLowerCase() for legacy support of tool names
  return type ? gTileContentInfoMap[type.toLowerCase()] : undefined;
}

export function getTileContentModels() {
  return Object.values(gTileContentInfoMap).map(info => info.modelClass);
}

export function getTileTypes() {
  // the keys are toLowerCased(), so we look up the actual id
  return Object.values(gTileContentInfoMap).map(info => info.type);
}

export interface ITileExportOptions {
  json?: boolean; // default true, but some tiles (e.g. geometry) use their export code to produce other formats
  includeId?: boolean;
  excludeTitle?: boolean;
  rowHeight?: number;
  transformImageUrl?: (url: string, filename?: string) => string;
}

export interface IDocumentExportOptions extends ITileExportOptions {
  includeTileIds?: boolean;
  appendComma?: boolean;
  transformImageUrl?: (url: string, filename?: string) => string;
}
