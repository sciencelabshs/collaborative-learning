import * as React from "react";
import { observer, inject } from "mobx-react";
import { getSnapshot } from "mobx-state-tree";
import { ToolTileModelType } from "../../models/tools/tool-tile";
import { kGeometryToolID } from "../../models/tools/geometry/geometry-content";
import { kTextToolID } from "../../models/tools/text/text-content";
import { kImageToolID } from "../../models/tools/image/image-content";
import { kDrawingToolID } from "../../models/tools/drawing/drawing-content";
import { BaseComponent } from "../base";
import GeometryToolComponent from "./geometry-tool";
import TextToolComponent from "./text-tool";
import ImageToolComponent from "./image-tool";
import DrawingToolComponent from "./drawing-tool/drawing-tool";
import { HotKeys } from "../../utilities/hot-keys";
import * as FileSaver from "file-saver";
import { cloneDeep } from "lodash";
import "./tool-tile.sass";

export interface IToolApi {
  hasSelection: () => boolean;
  deleteSelection: () => void;
}

export interface IToolApiInterface {
  register: (id: string, toolApi: IToolApi) => void;
  unregister: (id: string) => void;
}

export interface IToolApiMap {
  [id: string]: IToolApi;
}

export const kDragRowHeight = "org.concord.clue.row.height";
export const kDragTileSource = "org.concord.clue.tile.src";
export const kDragTileId = "org.concord.clue.tile.id";
export const kDragTileContent = "org.concord.clue.tile.content";
// allows source compatibility to be checked in dragOver
export const dragTileSrcDocId = (id: string) => `org.concord.clue.src.${id}`;
export const dragTileType = (type: string) => `org.concord.clue.tile.type.${type}`;

export function extractDragTileSrcDocId(dataTransfer: DataTransfer) {
  for (const type of dataTransfer.types) {
    const result = /org\.concord\.clue\.src\.(.*)$/.exec(type);
    if (result) return result[1];
  }
}

export function extractDragTileType(dataTransfer: DataTransfer) {
  for (const type of dataTransfer.types) {
    const result = /org\.concord\.clue\.tile\.type\.(.*)$/.exec(type);
    if (result) return result[1];
  }
}

interface IProps {
  context: string;
  docId: string;
  scale?: number;
  tabIndex?: number;
  widthPct?: number;
  height?: number;
  model: ToolTileModelType;
  readOnly?: boolean;
  onSetCanAcceptDrop: (tileId?: string) => void;
}

const kToolComponentMap: any = {
        [kGeometryToolID]: GeometryToolComponent,
        [kImageToolID]: ImageToolComponent,
        [kTextToolID]: TextToolComponent,
        [kDrawingToolID]: DrawingToolComponent
      };

@inject("stores")
@observer
export class ToolTileComponent extends BaseComponent<IProps, {}> {

  private hotKeys: HotKeys = new HotKeys();

  public componentDidMount() {
    const { appMode } = this.stores;
    if (appMode !== "authed") {
      this.hotKeys.register({
        "cmd-shift-c": this.handleCopyJson
      });
    }
  }

  public render() {
    const { model, widthPct } = this.props;
    const { ui } = this.stores;
    const selectedClass = ui.isSelectedTile(model) ? " selected" : "";
    const ToolComponent = kToolComponentMap[model.content.type];
    const style: React.CSSProperties = {};
    if (widthPct) {
      style.width = `${Math.round(100 * widthPct / 100)}%`;
    }
    return (
      <div className={`tool-tile${selectedClass}`}
          data-tool-id={model.id}
          style={style}
          onKeyDown={this.handleKeyDown}
          onDragStart={this.handleToolDragStart}
          draggable={true}
      >
        <div className="tool-tile-drag-handle tool select">
          <svg className={`icon icon-select-tool`}>
            <use xlinkHref={`#icon-select-tool`} />
          </svg>
        </div>
        {this.renderTile(ToolComponent)}
      </div>
    );
  }

  private renderTile(ToolComponent: any) {
    const tileId = this.props.model.id;
    const isSelectedTile = (tileId === this.stores.ui.selectedTileId);
    return ToolComponent != null
            ? <ToolComponent key={tileId} isSelectedTile={isSelectedTile} {...this.props} />
            : null;
  }

  private handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    this.hotKeys.dispatch(e);
  }

  private handleCopyJson = () => {
    const { content } = this.props.model;
    const json = JSON.stringify(content);
    const { clipboard } = this.stores;
    clipboard.clear();
    clipboard.addJsonTileContent(this.props.model.id, content, this.stores);
    return true;
  }

  private handleToolDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // set the drag data
    const { model, docId, height, scale } = this.props;
    const snapshot = cloneDeep(getSnapshot(model));
    const id = snapshot.id;
    delete snapshot.id;
    const dragData = JSON.stringify(snapshot);
    e.dataTransfer.setData(kDragTileSource, docId);
    if (height) {
      e.dataTransfer.setData(kDragRowHeight, String(height));
    }
    e.dataTransfer.setData(kDragTileId, id);
    e.dataTransfer.setData(kDragTileContent, dragData);
    e.dataTransfer.setData(dragTileSrcDocId(docId), docId);
    e.dataTransfer.setData(dragTileType(model.content.type), model.content.type);

    // set the drag image
    const ToolComponent = kToolComponentMap[model.content.type];
    const dragElt = e.target as HTMLElement;
    // tool components can provide alternate dom node for drag image
    const dragImage = ToolComponent && ToolComponent.getDragImageNode
                        ? ToolComponent.getDragImageNode(dragElt)
                        : dragElt;
    const clientRect = dragElt.getBoundingClientRect();
    const offsetX = (e.clientX - clientRect.left) / (scale || 1);
    const offsetY = (e.clientY - clientRect.top) / (scale || 1);
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
  }

}
