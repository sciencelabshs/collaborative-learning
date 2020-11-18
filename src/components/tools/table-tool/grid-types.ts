import { Column, FormatterProps, HeaderRendererProps } from "react-data-grid";

export const kRowHeight = 34;
export const kIndexColumnWidth = 34;
export const kControlsColumnWidth = 36;

export interface IGridContext {
  showRowLabels: boolean;
  onSelectOneRow: (row: string) => void;
  onClearRowSelection: () => void;
  onClearCellSelection: () => void;
  onClearSelection: () => void;
}

export const kIndexColumnKey = "__index__";
export const kControlsColumnKey = "__controls__";
export interface TRow extends Record<string, any> {
  __id__: string;
  __index__?: number;
  __context__: IGridContext;
}

export interface TColumnAppData {
  editableName?: boolean;
  isEditing?: boolean;
  onBeginHeaderCellEdit?: () => boolean | undefined;
  onHeaderCellEditKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onEndHeaderCellEdit?: (value?: string) => void;
}
export interface TColumn extends Column<TRow> {
  appData?: TColumnAppData;
}
export interface TPosition { idx: number, rowIdx: number }
export type TFormatterProps = FormatterProps<TRow>;
export type THeaderRendererProps = HeaderRendererProps<TRow>;
export type OnRowSelectionChangeFn = (checked: boolean, isShiftClick: boolean) => void;
