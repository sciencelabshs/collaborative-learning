import React from "react";
import { CalculatedColumn, RowHeightArgs } from "react-data-grid";
import { kCellHorizontalPadding, kDefaultColumnWidth, kRowHeight, TRow } from "./table-types";
import { useNumberFormat } from "./use-number-format";

import './cell-formatter.scss';

export const formatValue = (
    formatter: (n: number | { valueOf(): number }) => string, value: any,
    width?: number, row?: TRow, rowHeight?: (args: any) => number
  ) => {
  if ((value == null) || (value === "")) return <span></span>;
  const num = Number(value);
  if (!isFinite(num)) {
    const cellWidth = (width || kDefaultColumnWidth) - kCellHorizontalPadding;
    const height = rowHeight && row ? rowHeight({ row }) : kRowHeight;
    return (
      <div className="text-cell" style={{ height, width: cellWidth }}>
        {value}
      </div>
    );
  }
  return <span>{formatter(num)}</span>;
};

interface CellFormatterProps {
  row: TRow;
  column: CalculatedColumn<TRow, any>;
}
export const getCellFormatter = (width: number, rowHeight: (args: RowHeightArgs<TRow>) => number) => {
  return ({ row, column }: CellFormatterProps) => {
    const formatter = useNumberFormat();
    return formatValue(formatter, row[column.key], width, row, rowHeight);
  };
};
