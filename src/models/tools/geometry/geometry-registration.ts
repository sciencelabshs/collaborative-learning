import { registerToolContentInfo } from "../tool-content-info";
import { kGeometryToolID, GeometryContentModel, GeometryMetadataModel,
  defaultGeometryContent, mapTileIdsInGeometrySnapshot } from "./geometry-content";
import { kGeometryDefaultHeight } from "./jxg-types";
import GeometryToolComponent from "../../../components/tools/geometry-tool/geometry-tool";

registerToolContentInfo({
  id: kGeometryToolID,
  tool: "geometry",
  titleBase: "Graph",
  modelClass: GeometryContentModel,
  metadataClass: GeometryMetadataModel,
  addSidecarNotes: true,
  defaultHeight: kGeometryDefaultHeight,
  exportNonDefaultHeight: true,
  defaultContent: defaultGeometryContent,
  snapshotPostProcessor: mapTileIdsInGeometrySnapshot,
  Component: GeometryToolComponent,
  toolTileClass: "geometry-tool-tile"
});
