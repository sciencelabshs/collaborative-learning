import classNames from "classnames";
import { useCallback, useMemo, useRef, useState } from "react";
import { IDataSet } from "../../../models/data/data-set";
import { TableMetadataModelType } from "../../../models/tools/table/table-content";
import { CellFormatter } from "./cell-formatter";
import CellTextEditor from "./cell-text-editor";
import { ColumnHeaderCell } from "./column-header-cell";
import {
  IGridContext, kControlsColumnKey, kControlsColumnWidth, kIndexColumnKey, kIndexColumnWidth, TColumn
} from "./table-types";
import { useColumnExtensions } from "./use-column-extensions";
import { useControlsColumn } from "./use-controls-column";

function estimateColumnWidthFromName(name: string) {
  // values taken from design spec
  return 62 + 9 * name.length;
}

interface IUseColumnsFromDataSet {
  gridContext: IGridContext;
  dataSet: IDataSet;
  metadata: TableMetadataModelType;
  readOnly?: boolean;
  columnChanges: number;
  RowLabelHeader: React.FC<any>;
  RowLabelFormatter: React.FC<any>;
  setColumnName: (column: TColumn, columnName: string) => void;
  onShowExpressionsDialog?: (attrId?: string) => void;
  onAddColumn: () => void;
  onRemoveColumn?: (attrId: string) => void;
  onRemoveRow: (rowId: string) => void;
}
export const useColumnsFromDataSet = ({
  gridContext, dataSet, metadata, readOnly, columnChanges, RowLabelHeader, RowLabelFormatter,
  setColumnName, onShowExpressionsDialog, onAddColumn, onRemoveColumn, onRemoveRow
}: IUseColumnsFromDataSet) => {
  const { attributes } = dataSet;
  const { ControlsHeaderRenderer, ControlsRowFormatter } = useControlsColumn({ readOnly, onAddColumn, onRemoveRow });
  // user-modified column widths aren't currently saved
  const columnWidths = useRef<Record<string, number>>({});

  const [columnEditingName, setColumnEditingName] = useState<string>();
  const handleSetColumnEditingName = (column?: TColumn) => {
    setColumnEditingName(column?.key);
  };

  const cellClasses = useCallback((attrId: string) => {
    const selectedColumnClass = { "selected-column": gridContext.isColumnSelected(attrId) };
    return {
      cellClass: classNames({ "has-expression": metadata.hasExpression(attrId), ...selectedColumnClass }),
      headerCellClass: classNames({ "rdg-cell-editing": columnEditingName === attrId, ...selectedColumnClass })
    };
  }, [columnEditingName, gridContext, metadata]);

  const columns = useMemo(() => {
    const cols: TColumn[] = attributes.map(attr => ({
      ...cellClasses(attr.id),
      name: attr.name,
      key: attr.id,
      width: columnWidths.current[attr.id] ||
              (columnWidths.current[attr.id] = estimateColumnWidthFromName(attr.name)),
      resizable: !readOnly,
      headerRenderer: ColumnHeaderCell,
      formatter: CellFormatter,
      editor: !readOnly && !metadata.hasExpression(attr.id) ? CellTextEditor : undefined,
      editorOptions: {
        editOnClick: !readOnly
      }
    }));
    cols.unshift({
      cellClass: "index-column",
      headerCellClass: "index-column-header",
      name: "Index",
      key: kIndexColumnKey,
      width: kIndexColumnWidth,
      maxWidth: kIndexColumnWidth,
      resizable: false,
      editable: false,
      frozen: true,
      headerRenderer: RowLabelHeader,
      formatter: RowLabelFormatter
    });
    if (!readOnly) {
      cols.push({
        cellClass: "controls-column",
        headerCellClass: "controls-column-header",
        name: "Controls",
        key: kControlsColumnKey,
        width: kControlsColumnWidth,
        maxWidth: kControlsColumnWidth,
        resizable: false,
        editable: false,
        frozen: false,
        headerRenderer: ControlsHeaderRenderer,
        formatter: ControlsRowFormatter
      });
    }
    columnChanges;  // eslint-disable-line no-unused-expressions
    return cols;
  }, [ControlsHeaderRenderer, ControlsRowFormatter, RowLabelHeader, RowLabelFormatter,
      attributes, cellClasses, columnChanges, metadata, readOnly]);

  useColumnExtensions({
    gridContext, metadata, readOnly, columns, columnEditingName,
    setColumnEditingName: handleSetColumnEditingName, setColumnName, onRemoveColumn, onShowExpressionsDialog
 });

  const onColumnResize = useCallback((idx: number, width: number) => {
    columnWidths.current[columns[idx].key] = width;
  }, [columns]);

  return { columns, onColumnResize };
};
