import classNames from "classnames";
import { observer } from "mobx-react";
import React from "react";
import ReactDOM from "react-dom";
import { Tooltip } from "react-tippy";
import { DiagramContentModelType } from "./diagram-content";
import { useTooltipOptions } from "../../hooks/use-tooltip-options";
import { IFloatingToolbarProps, useFloatingToolbarLocation }
  from "../../components/tiles/hooks/use-floating-toolbar-location";

import { VariableType } from "@concord-consortium/diagram-view";

import InsertVariableCardIcon from "./src/assets/insert-variable-card-icon.svg";
import VariableEditorIcon from "../shared-variables/assets/variable-editor-icon.svg";
import DeleteSelectionIcon from "../../assets/icons/delete/delete-selection-icon.svg";
import "./diagram-toolbar.scss";

/*
 * SvgToolbarButton
 * Taken and modified from drawing-toolbar-buttons.tsx
 */
interface ButtonStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}
interface ISvgToolbarButtonProps {
  SvgIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  buttonClass: string;
  disabled?: boolean;
  selected?: boolean;
  style?: ButtonStyle;
  title: string;
  onClick: () => void;
}
export const SvgToolbarButton: React.FC<ISvgToolbarButtonProps> = ({
  SvgIcon, buttonClass, disabled, selected, style, title, onClick
}) => {
  const tooltipOptions = useTooltipOptions();
  const stroke = style?.stroke || "#000000";
  const fill = style?.fill || "none";
  const strokeWidth = (style && Object.hasOwn(style, "strokeWidth")) ? style.strokeWidth : 2;
  return SvgIcon
    ? <Tooltip title={title} {...tooltipOptions}>
        <button className={classNames("diagram-tool-button", { disabled, selected }, buttonClass)}
            disabled={disabled} onClick={onClick} type="button">
          <SvgIcon fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </button>
      </Tooltip>
    : null;
};

interface IInsertVariableButton {
  disabled?: boolean;
  handleClick: () => void;
}
const InsertVariableButton = ({ disabled, handleClick }: IInsertVariableButton) => {
  return (
    <SvgToolbarButton SvgIcon={InsertVariableCardIcon} buttonClass="button-insert-variable" disabled={disabled}
      title="Insert Variable" onClick={handleClick} />
  );
};

interface IDialogButton {
  handleClick: () => void;
  selectedVariable?: VariableType;
}
const DialogButton = ({ handleClick, selectedVariable }: IDialogButton) => {
  return (
    <SvgToolbarButton SvgIcon={VariableEditorIcon} buttonClass="button-dialog" disabled={!selectedVariable}
      title="Edit Variable" onClick={handleClick} style={{fill: "#000000", strokeWidth: 0.1}} />
  );
};

interface IDeleteButton {
  handleClick: () => void;
  selectedVariable?: VariableType;
}
const DeleteButton = ({ handleClick, selectedVariable }: IDeleteButton) => {
  return (
    <SvgToolbarButton SvgIcon={DeleteSelectionIcon} buttonClass="button-delete" disabled={!selectedVariable}
      title="Delete" onClick={handleClick} />
  );
};

interface IProps extends IFloatingToolbarProps {
  content: DiagramContentModelType;
  disableInsertVariableButton?: boolean;
  handleDeleteClick: () => void;
  handleEditVariableClick: () => void;
  handleInsertVariableClick: () => void;
}
export const DiagramToolbar: React.FC<IProps> = observer(({
  content, disableInsertVariableButton, documentContent, handleDeleteClick, handleEditVariableClick,
  handleInsertVariableClick, onIsEnabled, ...others
}) => {
  const root = content?.root;
  const selectedVariable = root?.selectedNode?.variable;

  const enabled = onIsEnabled();
  const location = useFloatingToolbarLocation({
    documentContent,
    toolbarHeight: 34,
    toolbarTopOffset: 2,
    enabled,
    ...others
  });
  return documentContent
    ? ReactDOM.createPortal(
        <div className={`diagram-toolbar ${enabled && location ? "enabled" : "disabled"}`}
            style={location} onMouseDown={e => e.stopPropagation()}>
          <InsertVariableButton disabled={disableInsertVariableButton} handleClick={handleInsertVariableClick} />
          <DialogButton handleClick={handleEditVariableClick} selectedVariable={selectedVariable} />
          <DeleteButton handleClick={handleDeleteClick} selectedVariable={selectedVariable} />
        </div>, documentContent)
    : null;
});
