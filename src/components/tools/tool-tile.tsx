import classNames from "classnames";
import { debounce } from "lodash";
import { observer, inject } from "mobx-react";
import React from "react";
import ResizeObserver from "resize-observer-polyfill";
import { cloneTileSnapshotWithNewId, IDragTileItem, IDragTiles, ToolTileModelType } from "../../models/tools/tool-tile";
import { transformCurriculumImageUrl } from "../../models/tools/image/image-import-export";
import { getToolContentInfoById } from "../../models/tools/tool-content-info";
import { BaseComponent } from "../base";
import PlaceholderToolComponent from "./placeholder-tool/placeholder-tool";
import { IToolApi, TileResizeEntry, ToolApiInterfaceContext } from "./tool-api";
import { HotKeys } from "../../utilities/hot-keys";
import { TileCommentsComponent } from "./tile-comments";
import { LinkIndicatorComponent } from "./link-indicator";
import { hasSelectionModifier } from "../../utilities/event-utils";
import { uniqueId } from "../../utilities/js-utils";
import { getContentIdFromNode, getDocumentContentFromNode } from "../../utilities/mst-utils";
import TileDragHandle from "../../assets/icons/drag-tile/move.svg";
import TileResizeHandle from "../../assets/icons/resize-tile/expand-handle.svg";
import "../../utilities/dom-utils";
import dragPlaceholderImage from "../../assets/image_drag.png";

import "./tool-tile.sass";

export const kDragTiles = "org.concord.clue.drag-tiles";

export const kDragRowHeight = "org.concord.clue.row.height";
export const kDragTileSource = "org.concord.clue.tile.src";
export const kDragTileId = "org.concord.clue.tile.id";
export const kDragTileContent = "org.concord.clue.tile.content";
export const kDragTileCreate = "org.concord.clue.tile.create";
// allows source compatibility to be checked in dragOver
export const dragTileSrcDocId = (id: string) => `org.concord.clue.src.${id.toLowerCase()}`;
export const dragTileType = (type: string) => `org.concord.clue.tile.type.${type}`;
const kDefaultDragImageWidth = 80;

export function extractDragTileSrcDocId(dataTransfer: DataTransfer) {
  for (const type of dataTransfer.types) {
    const result = /org\.concord\.clue\.src\.(.*)$/.exec(type);
    if (result) return result[1];
  }
}

export function extractDragTileType(dataTransfer: DataTransfer) {
  if (dataTransfer && dataTransfer.types) {
    for (const type of dataTransfer.types) {
      const result = /org\.concord\.clue\.tile\.type\.(.*)$/.exec(type);
      if (result) return result[1];
    }
  }
}



/**
 * These props are used both by the ToolTileComponent and the components provided by the
 * individual tools.
 */
interface IToolTileBaseProps {
  context: string;
  documentId?: string;  // permanent id (key) of the containing document
  docId: string;  // ephemeral contentId for the DocumentContent
  documentContent: HTMLElement | null;
  isUserResizable: boolean;
  scale?: number;
  widthPct?: number;
  height?: number;
  model: ToolTileModelType;
  readOnly?: boolean;
  onResizeRow: (e: React.DragEvent<HTMLDivElement>) => void;
  onSetCanAcceptDrop: (tileId?: string) => void;
  onRequestTilesOfType: (tileType: string) => Array<{ id: string, title?: string }>;
  onRequestUniqueTitle: (tileId: string) => string | undefined;
  onRequestRowHeight: (tileId: string, height?: number, deltaHeight?: number) => void;
}

export interface IActionHandlers {
  handlePaste: () => void;
}

export interface IRegisterToolApiProps {
  onRegisterToolApi: (toolApi: IToolApi, facet?: string) => void;
  onUnregisterToolApi: (facet?: string) => void;
}

export interface IToolTileProps extends IToolTileBaseProps, IRegisterToolApiProps {
  toolTile: HTMLElement | null;
}

interface IProps extends IToolTileBaseProps {
}

interface IDragTileButtonProps {
  divRef: (instance: HTMLDivElement | null) => void;
  hovered: boolean;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}
const DragTileButton = ({ divRef, hovered, selected, onClick }: IDragTileButtonProps) => {
  const classes = classNames("tool-tile-drag-handle", { hovered, selected });
  return (
    <div className={`tool-tile-drag-handle-wrapper`} ref={divRef} onClick={onClick}>
      <TileDragHandle className={classes} />
    </div>
  );
};

interface IResizeTileButtonProps {
  divRef: (instance: HTMLDivElement | null) => void;
  hovered: boolean;
  selected: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ResizeTileButton =
  ({ divRef, hovered, selected, onDragStart }: IResizeTileButtonProps) => {
  const classes = classNames("tool-tile-resize-handle", { hovered, selected });
  return (
    <div className={`tool-tile-resize-handle-wrapper`} ref={divRef} onDragStart={onDragStart}>
      <TileResizeHandle className={classes} />
    </div>
  );
};

interface IState {
  hoverTile: boolean;
}

const defaultDragImage = document.createElement("img");
defaultDragImage.src = dragPlaceholderImage;

@inject("stores")
@observer
export class ToolTileComponent extends BaseComponent<IProps, IState> {

  static contextType = ToolApiInterfaceContext;
  declare context: React.ContextType<typeof ToolApiInterfaceContext>;

  private modelId: string;
  private domElement: HTMLDivElement | null;
  private resizeObserver: ResizeObserver;
  private hotKeys: HotKeys = new HotKeys();
  private dragElement: HTMLDivElement | null;
  private resizeElement: HTMLDivElement | null;

  state = {
    hoverTile: false
  };

  constructor(props: IProps) {
    super(props);

    const { appConfig } = this.stores;
    const { model } = props;
    const { content: { type } } = model;
    this.modelId = model.id;
    model.setDisabledFeatures(appConfig.getDisabledFeaturesOfTile(type));

    this.hotKeys.register({
      "cmd-option-e": this.handleCopyImportJsonToClipboard,
      "cmd-shift-c": this.handleCopyModelJson
    });
  }

  public componentDidMount() {
    const options = { capture: true, passive: true };
    this.domElement?.addEventListener("touchstart", this.handlePointerDown, options);
    this.domElement?.addEventListener("mousedown", this.handlePointerDown, options);
  }

  public componentDidUpdate() {
    if (this.domElement && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.target === this.domElement) {
            this.handleResizeDebounced(entry);
          }
        }
      });
      this.resizeObserver.observe(this.domElement);
    }
  }

  public componentWillUnmount() {
    this.resizeObserver?.disconnect();

    const options = { capture: true, passive: true };
    this.domElement?.removeEventListener("mousedown", this.handlePointerDown, options);
    this.domElement?.removeEventListener("touchstart", this.handlePointerDown, options);
  }

  public render() {
    const { model, readOnly, isUserResizable, widthPct } = this.props;
    const { hoverTile } = this.state;
    const { appConfig, ui } = this.stores;
    const { Component: ToolComponent, toolTileClass } = getToolContentInfoById(model.content.type) || {};
    const isPlaceholderTile = ToolComponent === PlaceholderToolComponent;
    const isTileSelected = ui.isSelectedTile(model);
    const tileSelectedForComment = isTileSelected && ui.showChatPanel;
    const classes = classNames("tool-tile", model.display, toolTileClass, {
                      placeholder: isPlaceholderTile,
                      readonly: readOnly,
                      hovered: this.state.hoverTile,
                      selected: isTileSelected ,
                      "selected-for-comment": tileSelectedForComment});
    const isDraggable = !isPlaceholderTile && !appConfig.disableTileDrags;
    const dragTileButton = isDraggable &&
                            <DragTileButton divRef={elt => this.dragElement = elt}
                              hovered={hoverTile} selected={isTileSelected}
                              onClick={e => ui.setSelectedTile(model, {append: hasSelectionModifier(e)})} />;
    const resizeTileButton = isUserResizable &&
                              <ResizeTileButton divRef={elt => this.resizeElement = elt}
                                hovered={hoverTile}
                                selected={isTileSelected}
                                onDragStart={e => this.props.onResizeRow(e)} />;

    const style: React.CSSProperties = {};
    if (widthPct) {
      style.width = `${Math.round(100 * widthPct / 100)}%`;
    }
    return (
      <div className={classes} data-testid="tool-tile"
          ref={elt => this.domElement = elt}
          data-tool-id={model.id}
          style={style}
          tabIndex={-1}
          onMouseEnter={isDraggable ? e => this.setState({ hoverTile: true }) : undefined}
          onMouseLeave={isDraggable ? e => this.setState({ hoverTile: false }) : undefined}
          onKeyDown={this.handleKeyDown}
          onDragStart={this.handleToolDragStart}
          onDragEnd={this.triggerResizeHandler}
          draggable={true}
      >
        {this.renderLinkIndicators()}
        {dragTileButton}
        {resizeTileButton}
        {this.renderTile(ToolComponent)}
        {this.renderTileComments()}
      </div>
    );
  }

  private renderTile(ToolComponent: any) {
    const tileId = this.props.model.id;
    return ToolComponent != null
            ? <ToolComponent
                key={tileId} toolTile={this.domElement} {...this.props}
                onRegisterToolApi={this.handleRegisterToolApi}
                onUnregisterToolApi={this.handleUnregisterToolApi} />
            : null;
  }

  private renderLinkIndicators() {
    const { model } = this.props;
    const toolApiInterface = this.context;
    const toolApi = toolApiInterface?.getToolApi(model.id);
    const clientTableLinks = toolApi?.getLinkedTables?.();
    return clientTableLinks
            ? clientTableLinks.map((id, index) => {
                return <LinkIndicatorComponent key={id} id={id} index={index} />;
              })
            : null; // tables don't use the original link indicator any more
  }

  private renderTileComments() {
    const tileId = this.props.model.id;
    const { documents } = this.stores;
    const documentContent = documents.findDocumentOfTile(tileId);
    if (documentContent) {
      const commentsModel = documentContent.comments.get(tileId);
      if (commentsModel) {
        return <TileCommentsComponent model={commentsModel} docKey={documentContent.key} />;
      }
    }
  }

  private getToolResizeHandler = () => {
    const { model } = this.props;
    const toolApiInterface = this.context;
    return toolApiInterface?.getToolApi(`${model.id}[layout]`)?.handleTileResize ||
            toolApiInterface?.getToolApi(model.id)?.handleTileResize;
  };

  private handleRegisterToolApi = (toolApi: IToolApi, facet?: string) => {
    const id = facet ? `${this.modelId}[${facet}]` : this.modelId;
    const toolApiInterface = this.context;
    toolApiInterface?.register(id, toolApi);
    // trigger initial render
    this.forceUpdate();
  };

  private handleUnregisterToolApi = (facet?: string) => {
    const id = facet ? `${this.modelId}[${facet}]` : this.modelId;
    const toolApiInterface = this.context;
    toolApiInterface?.unregister(id);
  };

  private handleResizeDebounced = debounce((entry: ResizeObserverEntry) => {
    this.getToolResizeHandler()?.(entry);
  }, 100);

  private handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    this.hotKeys.dispatch(e);
  };

  private handlePointerDown = (e: MouseEvent | TouchEvent) => {
    const { model } = this.props;
    const { ui } = this.stores;

    // ignore mousedown on drag element
    let targetElement: HTMLElement | null = e.target as HTMLElement;
    while ((targetElement !== null) && (targetElement !== this.dragElement)) {
      targetElement = targetElement.parentElement;
    }
    if (targetElement === this.dragElement) {
      return;
    }

    // Select the tile if the tool doesn't handle the selection itself
    const toolContentInfo = getToolContentInfoById(model.content.type);
    if (!toolContentInfo?.tileHandlesOwnSelection) {
      ui.setSelectedTile(model, {append: hasSelectionModifier(e)});
    }
  };

  private handleCopyImportJsonToClipboard = () => {
    const { appConfig, unit } = this.stores;
    const unitBasePath = appConfig.getUnitBasePath(unit.code);
    const transformImageUrl = (url?: string, filename?: string) => {
      return transformCurriculumImageUrl(url, unitBasePath, filename);
    };
    let tileJsonString = this.props.model.exportJson({ transformImageUrl, includeId: true });
    if (tileJsonString) {
      // Put all exported content in a top-level object, under key: "content",
      // but _preserve_ existing formatting (which collapses some elements
      // into a single line; no: indent). But DO indent w.r.t. the new key.
      tileJsonString = (tileJsonString.slice(-1) === "\n")
        ? tileJsonString.slice(0, -1) // Remove trailing new line char.
        : tileJsonString;
    }
    tileJsonString && navigator.clipboard.writeText(tileJsonString);
    return true;
  };

  private handleCopyModelJson = () => {
    const { content } = this.props.model;
    const { clipboard } = this.stores;
    clipboard.clear();
    clipboard.addJsonTileContent(this.props.model.id, content, this.stores);
    return true;
  };

  private handleToolDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // tile dragging can be disabled globally via appConfig
    if (this.stores.appConfig.disableTileDrags) {
      e.preventDefault();
      return;
    }

    // tile dragging can be disabled for individual tiles
    const target: HTMLElement | null = e.target as HTMLElement;
    if (!target || target.querySelector(".disable-tile-drag")) {
      e.preventDefault();
      return;
    }
    // tile dragging can be disabled for individual tile contents,
    // which only allows those tiles to be dragged by their drag handle
    if (target?.closest(".disable-tile-content-drag")) {
      const eltTarget = document.elementFromPoint(e.clientX, e.clientY);
      if (!eltTarget?.closest(".tool-tile-drag-handle")) {
        e.preventDefault();
        return;
      }
    }
    // set the drag data
    const { model, docId } = this.props;
    const ToolComponent = getToolContentInfoById(model.content.type)?.Component;
    // can't drag placeholder tiles
    if (ToolComponent === PlaceholderToolComponent) {
      e.preventDefault();
      return;
    }
    if (!e.dataTransfer) return;

    // TODO: should this be moved to document-content.tsx since it is more than just the current tile?
    //       and also the drop handler is there

    const { ui } = this.stores;
    const dragSrcContentId = getContentIdFromNode(model);
    if (!dragSrcContentId) return;

    // dragging a tile selects it first
    ui.setSelectedTile(model, { append: hasSelectionModifier(e) });

    const dragTiles: IDragTiles = {
      sourceDocId: docId,
      items: this.getDragTileItems(dragSrcContentId, ui.selectedTileIds)
    };

    // create a sorted array of selected tiles
    dragTiles.items.sort((a, b) => {
      if (a.rowIndex < b.rowIndex) return -1;
      if (a.rowIndex > b.rowIndex) return 1;
      if (a.tileIndex < b.tileIndex) return -1;
      if (a.tileIndex > b.tileIndex) return 1;
      return 0;
    });
    e.dataTransfer.setData(kDragTiles, JSON.stringify(dragTiles));

    // we have to set this as a transfer type because the kDragTiles contents are not available in drag over events
    e.dataTransfer.setData(dragTileSrcDocId(docId), docId);

    // to support existing geometry and drawing layer drop logic set the single tile drag fields
    // if only 1 tile is selected
    if (dragTiles.items.length === 1) {
      const dragTile = dragTiles.items[0];
      e.dataTransfer.setData(kDragTileId, dragTile.tileId);
      e.dataTransfer.setData(kDragTileContent, dragTile.tileContent);
      e.dataTransfer.setData(dragTileType(model.content.type), dragTile.tileType);
    }

    // TODO: should we create an array of drag images here?

    // set the drag image
    const offsetX = kDefaultDragImageWidth;
    const offsetY = 0;
    e.dataTransfer.setDragImage(defaultDragImage, offsetX, offsetY);
  };

  private getDragTileItems(dragSrcContentId: string, tileIds: string[]) {
    const { model } = this.props;
    const dragTileItems: IDragTileItem[] = [];

    const idMap: { [id: string]: string } = {};
    tileIds.forEach(tileId => idMap[tileId] = uniqueId());

    const content = getDocumentContentFromNode(model);
    tileIds.forEach(tileId => {
      const srcTile = content?.getTile(tileId) || (tileId === model.id ? model : undefined);
      if (srcTile) {
        const tileContentId = getContentIdFromNode(srcTile);
        if (!tileContentId || (tileContentId !== dragSrcContentId)) return;
        const rowId = content?.findRowContainingTile(srcTile.id);
        const rowIndex = rowId && content?.getRowIndex(rowId) || 0;
        const row = rowId ? content?.getRow(rowId) : undefined;
        const rowHeight = row?.height;
        const tileIndex = row?.tiles.findIndex(t => t.tileId === tileId) || 0;
        const clonedTile = cloneTileSnapshotWithNewId(srcTile, idMap[srcTile.id]);
        getToolContentInfoById(clonedTile.content.type)?.snapshotPostProcessor?.(clonedTile.content, idMap);
        dragTileItems.push({
          rowIndex, rowHeight, tileIndex,
          tileId: srcTile.id,
          tileContent: JSON.stringify(clonedTile),
          tileType: srcTile.content.type
        });
      }
    });

    return dragTileItems;
  }

  private triggerResizeHandler = () => {
    const handler = this.getToolResizeHandler();
    if (this.domElement && handler) {
      const bounds = this.domElement.getBoundingClientRect();
      const kBorderSize = 4;
      const entry: TileResizeEntry = {
        target: this.domElement,
        contentRect: {
          x: 0,
          y: 0,
          width: bounds.width - kBorderSize,
          height: bounds.height - kBorderSize,
          top: 0,
          right: bounds.width - kBorderSize,
          bottom: bounds.height - kBorderSize,
          left: 0,
          toJSON: () => ""
        }
      };
      // calling the resize handler triggers a re-render
      handler(entry);
    }
  };
}
