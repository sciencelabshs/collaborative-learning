import { registerTileComponentInfo } from "../tile-component-info";
import { registerTileContentInfo } from "../tile-content-info";
import { GeometryContentModel, GeometryMetadataModel, defaultGeometryContent } from "./geometry-content";
import { kGeometryTileType } from "./geometry-types";
import { kGeometryDefaultHeight } from "./jxg-types";
import GeometryToolComponent from "../../../components/tiles/geometry/geometry-tile";
import GeometryToolIcon from "../../../clue/assets/icons/graph-tool.svg";

registerTileContentInfo({
  type: kGeometryTileType,
  titleBase: "Graph",
  modelClass: GeometryContentModel,
  metadataClass: GeometryMetadataModel,
  addSidecarNotes: true,
  defaultHeight: kGeometryDefaultHeight,
  exportNonDefaultHeight: true,
  defaultContent: defaultGeometryContent
});

registerTileComponentInfo({
  type: kGeometryTileType,
  Component: GeometryToolComponent,
  tileEltClass: "geometry-tool-tile",
  tileHandlesOwnSelection: true,
  Icon: GeometryToolIcon
});
