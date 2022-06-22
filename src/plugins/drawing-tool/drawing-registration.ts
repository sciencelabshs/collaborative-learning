import { registerToolContentInfo } from "../../models/tools/tool-content-info";
import { DrawingContentModel, DrawingToolMetadataModel, defaultDrawingContent } from "./model/drawing-content";
import { kDrawingToolID, kDrawingDefaultHeight } from "./model/drawing-types";
import DrawingToolComponent from "./components/drawing-tool";
import DrawingToolIcon from "../../clue/assets/icons/draw-tool.svg";
import { DrawingMigrator } from "./model/drawing-migrator";

registerToolContentInfo({
  id: kDrawingToolID,
  // TODO: maybe there is a better way to do this kind of casting?
  //   The issue is that modelClass prop has a type of `typeof ToolContentModel`,
  //   That type is pretty restrictive and doesn't accommodate the return of 
  //   types.snapshotProcessor. There might be a better way to get a 
  //   typescript type for a MST "Class" which is less restrictive
  modelClass: DrawingMigrator as typeof DrawingContentModel,
  metadataClass: DrawingToolMetadataModel,
  defaultHeight: kDrawingDefaultHeight,
  exportNonDefaultHeight: true,
  defaultContent: defaultDrawingContent,
  Component: DrawingToolComponent,
  toolTileClass: "drawing-tool-tile",
  Icon: DrawingToolIcon
});
