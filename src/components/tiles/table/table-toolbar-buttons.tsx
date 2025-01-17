import React from "react";
import { Tooltip, TooltipProps } from "react-tippy";
import classNames from "classnames";

import DeleteSelectedIconSvg from "../../../assets/icons/delete/delete-selection-icon.svg";
import SetExpressionIconSvg from "../../../clue/assets/icons/table/set-expression-icon.svg";
import { useTooltipOptions } from "../../../hooks/use-tooltip-options";

import "./table-toolbar.scss";

interface ITableButtonProps {
  className?: string;
  icon: any;
  onClick: () => void;
  tooltipOptions: TooltipProps;
}
const TableButton = ({ className, icon, onClick, tooltipOptions}: ITableButtonProps) => {
  const to = useTooltipOptions(tooltipOptions);
  const classes = classNames("toolbar-button", className);
  return (
    <Tooltip {...to}>
      <button className={classes} onClick={onClick}>
        {icon}
      </button>
    </Tooltip>
  );
};
interface IDeleteSelectedProps {
  onClick: () => void;
}
export const DeleteSelectedButton = ({ onClick }: IDeleteSelectedProps) => (
  <TableButton
    className="delete"
    icon={<DeleteSelectedIconSvg />}
    onClick={onClick}
    tooltipOptions={{ title: "Clear cell" }}
  />
);

interface ISetExpressionButtonProps {
  onClick: () => void;
}
export const SetExpressionButton = ({ onClick }: ISetExpressionButtonProps) => (
  <TableButton
    className="set-expression"
    icon={<SetExpressionIconSvg />}
    onClick={onClick}
    tooltipOptions={{ title: "Set expression" }}
  />
);
