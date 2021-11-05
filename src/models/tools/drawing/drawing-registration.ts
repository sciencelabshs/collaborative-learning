import { registerToolContentInfo } from "../tool-content-info";
import { DrawingContentModel, DrawingToolMetadataModel, defaultDrawingContent } from "./drawing-content";
import { kDrawingToolID, kDrawingDefaultHeight } from "./drawing-types";
import DrawingToolComponent from "../../../components/tools/drawing-tool/drawing-tool";
import DrawingToolIcon from "../../../clue/assets/icons/draw-tool.svg";

registerToolContentInfo({
  id: kDrawingToolID,
  tool: "drawing",
  modelClass: DrawingContentModel,
  metadataClass: DrawingToolMetadataModel,
  defaultHeight: kDrawingDefaultHeight,
  exportNonDefaultHeight: true,
  defaultContent: defaultDrawingContent,
  Component: DrawingToolComponent,
  toolTileClass: "drawing-tool-tile",
  Icon: DrawingToolIcon
});
