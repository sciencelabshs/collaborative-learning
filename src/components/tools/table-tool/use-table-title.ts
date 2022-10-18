import { useCallback, useEffect, useRef } from "react";
import { ToolTileModelType } from "../../../models/tools/tool-tile";
import { useCurrent } from "../../../hooks/use-current";
import { IGridContext } from "./table-types";
import { TableContentModelType } from "../../../models/tools/table/table-content";

interface IProps {
  gridContext: IGridContext;
  content: TableContentModelType;
  readOnly?: boolean;
  onRequestUniqueTitle?: () => string | undefined;
  onSetTableTitle?: (title: string) => void;
  requestRowHeight: () => void;
}
export const useTableTitle = ({
  gridContext, content, readOnly, onRequestUniqueTitle, onSetTableTitle, requestRowHeight
}: IProps) => {
  
  const getTitle = useCallback(() => content.dataSet.name, [content]);
  const editingTitle = useCurrent(getTitle());

  const onBeginTitleEdit = () => {
    editingTitle.current = getTitle();
    gridContext.onClearSelection();
    return !readOnly;
  };
  const onEndTitleEdit = (title?: string) => {
    if (!readOnly && (title != null) && (title !== editingTitle.current)) {
      onSetTableTitle?.(title);
      requestRowHeight();
    }
  };

  // request a default title if we don't already have one
  const onRequestUniqueTitleRef = useRef(onRequestUniqueTitle);
  useEffect(() => {
    if (!content.dataSet.name) {
      // wait for all tiles to have registered their callbacks
      setTimeout(() => {
        const _title = onRequestUniqueTitleRef.current?.();
        if (_title) {
          content.dataSet.setName(_title);
        }
      }, 100);
    }
    // don't request a title after we've been unmounted
    return () => onRequestUniqueTitleRef.current = undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { getTitle, onBeginTitleEdit, onEndTitleEdit };
};
