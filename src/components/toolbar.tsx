import { inject, observer } from "mobx-react";
import React from "react";
import classNames from "classnames";

import { IconComponent } from "../app-config-context";
import { BaseComponent, IBaseProps } from "./base";
import { DocumentModelType, DocumentTool } from "../models/document/document";
import { IDocumentContentAddTileOptions, IDragToolCreateInfo } from "../models/document/document-content";
import { getToolContentInfoByTool, IToolContentInfo } from "../models/tools/tool-content-info";
import { ToolButtonSnapshot } from "../models/tools/tool-types";
import { IToolApiMap, kDragTileCreate  } from "./tools/tool-tile";

import "./toolbar.sass";

export interface IToolButtonConfig extends ToolButtonSnapshot {
  icon?: IconComponent;
}

export type ToolbarConfig = IToolButtonConfig[];

interface IProps extends IBaseProps {
  document: DocumentModelType;
  config: ToolbarConfig;
  toolApiMap: IToolApiMap;
}

interface IState {
  defaultTool: string;
  activeTool: string;
}

interface IButtonProps {
  config: IToolButtonConfig;
  ToolIcon?: IconComponent;
  isActive: boolean;
  isDisabled: boolean;
  onSetToolActive: (tool: DocumentTool, isActive: boolean) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>, tool: DocumentTool) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, tool: DocumentTool) => void;
  onShowDropHighlight: () => void;
  onHideDropHighlight: () => void;
}

const ToolButtonComponent: React.FC<IButtonProps> =
  ({ config, ToolIcon, isActive, isDisabled, onSetToolActive, onClick, onDragStart,
      onShowDropHighlight, onHideDropHighlight }) => {

  const { name, title, isTileTool } = config;
  const toolName = name as DocumentTool;

  const handleMouseDown = () => {
    if (isDisabled) return;

    onSetToolActive(toolName, true);

    const endActiveHandler = () => {
      onSetToolActive(toolName, false);
      document.removeEventListener("mouseup", endActiveHandler, true);
      document.removeEventListener("dragend", endActiveHandler, true);
    };

    document.addEventListener("mouseup", endActiveHandler, true);
    document.addEventListener("dragend", endActiveHandler, true);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick(e, toolName);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    onDragStart(e, toolName);
  };

  return (
    <div className={classNames("tool", toolName, { active: isActive }, isDisabled ? "disabled" : "enabled")}
        key={name}
        title={title || ""}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDragStart={isTileTool ? handleDrag : undefined}
        draggable={isTileTool || false}
        onMouseEnter={isTileTool ? onShowDropHighlight : undefined}
        onMouseLeave={isTileTool ? onHideDropHighlight : undefined}>
      {ToolIcon && <ToolIcon />}
    </div>
  );
};

@inject("stores")
@observer
export class ToolbarComponent extends BaseComponent<IProps, IState> {

  state = {
    defaultTool: "",
    activeTool: ""
  }

  public componentDidMount() {
    const defaultTool = this.props.config.find(item => item.isDefault);
    if (defaultTool) {
      this.setState({ defaultTool: defaultTool.name, activeTool: defaultTool.name });
    }
  }

  public render() {
    const handleClickTool = (e: React.MouseEvent<HTMLDivElement>, tool: DocumentTool) => {
      switch (tool) {
        case "select":
          this.handleSelect();
          break;
        case "delete":
          this.handleDelete();
          break;
        default:
          this.handleAddToolTile(tool);
          break;
      }
    };
    const handleSetActiveTool = (tool: DocumentTool, isActive: boolean) => {
      const { defaultTool } = this.state;
      this.setState({ activeTool: isActive && (tool !== defaultTool) ? tool : defaultTool });
    };
    const handleDragTool = (e: React.DragEvent<HTMLDivElement>, tool: DocumentTool) => {
      this.handleDragNewToolTile(tool, e);
    };
    const renderToolButtons = (toolbarConfig: ToolbarConfig) => {
      const { ui: { selectedTileIds } } = this.stores;
      return toolbarConfig.map(config => {
        const buttonProps: IButtonProps = {
          config,
          ToolIcon: config.icon,
          isActive: config.name === this.state.activeTool,
          isDisabled: config.name === "delete" && !selectedTileIds.length,
          onSetToolActive: handleSetActiveTool,
          onClick: handleClickTool,
          onDragStart: handleDragTool,
          onShowDropHighlight: this.showDropRowHighlight,
          onHideDropHighlight: this.removeDropRowHighlight
        };
        return <ToolButtonComponent key={config.name} {...buttonProps} />;
      });
    };
    return (
      <div className="toolbar">
        {renderToolButtons(this.props.config)}
      </div>
    );
  }

  private showDropRowHighlight = () => {
    const { document } = this.props;
    document.content.showPendingInsertHighlight(true);
  }

  private removeDropRowHighlight = () => {
    const { document } = this.props;
    document.content.showPendingInsertHighlight(false);
  }

  private getUniqueTitle(toolContentInfo: IToolContentInfo) {
    const { document, toolApiMap } = this.props;
    const { id, titleBase } = toolContentInfo;
    const getTileTitle = (tileId: string) => toolApiMap[tileId]?.getTitle?.();
    return titleBase && document.getUniqueTitle(id, titleBase, getTileTitle);
  }

  private handleAddToolTile(tool: DocumentTool) {
    const { document } = this.props;
    const { ui } = this.stores;
    const toolContentInfo = getToolContentInfoByTool(tool);
    const newTileOptions: IDocumentContentAddTileOptions = {
            title: this.getUniqueTitle(toolContentInfo),
            addSidecarNotes: !!toolContentInfo?.addSidecarNotes,
            insertRowInfo: { rowInsertIndex: document.content.defaultInsertRow }
          };
    const rowTile = document.addTile(tool, newTileOptions);
    if (rowTile && rowTile.tileId) {
      ui.setSelectedTileId(rowTile.tileId);
      this.setState(state => ({ activeTool: state.defaultTool }));
    }
  }

  private handleSelect() {
    // nothing to do
  }

  private handleDelete() {
    const { document } = this.props;
    const { ui } = this.stores;
    ui.selectedTileIds.forEach(tileId => {
      const toolApi = this.props.toolApiMap[tileId];
      // if there is selected content inside the selected tile, delete it first
      if (toolApi?.hasSelection?.()) {
        toolApi.deleteSelection?.();
      }
      else {
        ui.removeTileIdFromSelection(tileId);
        document.deleteTile(tileId);
      }
    });
    this.setState(state => ({ activeTool: state.defaultTool }));
  }

  private handleDragNewToolTile = (tool: DocumentTool, e: React.DragEvent<HTMLDivElement>) => {
    // remove hover-insert highlight when we start a tile drag
    this.removeDropRowHighlight();

    const toolContentInfo = getToolContentInfoByTool(tool);
    const dragInfo: IDragToolCreateInfo = { tool, title: this.getUniqueTitle(toolContentInfo) };
    e.dataTransfer.setData(kDragTileCreate, JSON.stringify(dragInfo));
  }
}
