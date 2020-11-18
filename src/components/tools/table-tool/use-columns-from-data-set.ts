import { useCallback, useMemo, useRef, useState } from "react";
import { TextEditor } from "react-data-grid";
import { IDataSet } from "../../../models/data/data-set";
import { EditableHeaderCell } from "./editable-header-cell";
import {
  IGridContext, kControlsColumnKey, kControlsColumnWidth, kIndexColumnKey, kIndexColumnWidth, TColumn
} from "./grid-types";
import { useControlsColumn } from "./use-controls-column";
import { useEditableColumnNames } from "./use-editable-column-names";
import { useRowLabelsButton } from "./use-row-labels-button";

function estimateColumnWidthFromName(name: string) {
  // values taken from design spec
  return 62 + 9 * name.length;
}

interface IUseColumnsFromDataSet {
  gridContext: IGridContext;
  dataSet: IDataSet;
  readOnly?: boolean;
  inputRowId: string;
  columnChanges: number;
  showRowLabels: boolean;
  setShowRowLabels: (show: boolean) => void;
  setColumnName: (column: TColumn, columnName: string) => void;
  onAddColumn: () => void;
  onRemoveRow: (rowId: string) => void;
}
export const useColumnsFromDataSet = ({
  gridContext, dataSet, readOnly, inputRowId, columnChanges, showRowLabels,
  setShowRowLabels, setColumnName, onAddColumn, onRemoveRow
}: IUseColumnsFromDataSet) => {
  const { attributes } = dataSet;
  const { RowLabelsButton, RowLabelsFormatter } = useRowLabelsButton(inputRowId, showRowLabels, setShowRowLabels);
  const { ControlsHeaderRenderer, ControlsRowFormatter } = useControlsColumn({ readOnly, onAddColumn, onRemoveRow });
  const columnWidths = useRef<Record<string, number>>({});

  const [columnEditingName, setColumnEditingName] = useState<string>();
  const handleSetColumnEditingName = (column?: TColumn) => {
    setColumnEditingName(column?.key);
  };

  const columns = useMemo(() => {
    const cols: TColumn[] = attributes.map(attr => ({
      headerCellClass: columnEditingName === attr.id ? "rdg-cell-editing" : undefined,
      name: attr.name,
      key: attr.id,
      width: columnWidths.current[attr.id] ||
              (columnWidths.current[attr.id] = estimateColumnWidthFromName(attr.name)),
      resizable: !readOnly,
      headerRenderer: EditableHeaderCell,
      editor: !readOnly ? TextEditor : undefined,
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
      headerRenderer: RowLabelsButton,
      formatter: RowLabelsFormatter
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
  }, [ControlsHeaderRenderer, ControlsRowFormatter, RowLabelsButton, RowLabelsFormatter,
      attributes, columnChanges, columnEditingName, readOnly]);

  useEditableColumnNames({
    gridContext, readOnly, columns, columnEditingName,
    setColumnEditingName: handleSetColumnEditingName, setColumnName });

  const onColumnResize = useCallback((idx: number, width: number) => {
    columnWidths.current[columns[idx].key] = width;
  }, [columns]);

  return { columns, onColumnResize };
};
