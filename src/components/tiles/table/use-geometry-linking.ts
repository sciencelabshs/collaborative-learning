import { useCallback, useEffect } from "react";
import { kGraphTileType } from "../../../plugins/graph/graph-types";
import { useCurrent } from "../../../hooks/use-current";
import { useFeatureFlag } from "../../../hooks/use-stores";
import { getColorMapEntry } from "../../../models/shared/shared-data-set-colors";
import { kGeometryTileType } from "../../../models/tiles/geometry/geometry-types";
import { ITileLinkMetadata } from "../../../models/tiles/table-link-types";
import {
  addTableToDocumentMap, getLinkedTableIndex, removeTableFromDocumentMap
} from "../../../models/tiles/table-links";
import { ITileModel } from "../../../models/tiles/tile-model";
import { useLinkGeometryDialog } from "./use-link-geometry-dialog";

interface IProps {
  documentId?: string;
  model: ITileModel;
  hasLinkableRows: boolean;
  onRequestTilesOfType: (tileType: string) => ITileLinkMetadata[];
  onLinkGeometryTile: (geomTileInfo: ITileLinkMetadata) => void;
  onUnlinkGeometryTile: (geomTileInfo: ITileLinkMetadata) => void;
}
export const useGeometryLinking = ({
  documentId, model, hasLinkableRows, onRequestTilesOfType, onLinkGeometryTile, onUnlinkGeometryTile
}: IProps) => {
  const modelId = model.id;
  const showLinkButton = useFeatureFlag("GeometryLinkedTables");
  const geometryTiles = useLinkableGeometryTiles({ model, onRequestTilesOfType });
  const isLinkEnabled = hasLinkableRows && (geometryTiles.length > 0);
  const colorMapEntry = getColorMapEntry(modelId);
  const linkColors = colorMapEntry?.colorSet;

  const [showLinkGeometryDialog] =
          useLinkGeometryDialog({ geometryTiles, model, onLinkGeometryTile, onUnlinkGeometryTile });

  useEffect(() => {
    documentId && addTableToDocumentMap(documentId, modelId);
    return () => removeTableFromDocumentMap(modelId);
  }, [documentId, modelId]);

  const getLinkIndex = useCallback(() => {
    return showLinkButton ? getLinkedTableIndex(modelId) : -1;
  }, [modelId, showLinkButton]);

  return { showLinkButton, isLinkEnabled, linkColors, getLinkIndex, showLinkGeometryDialog };
};

interface IUseLinkableGeometryTilesProps {
  model: ITileModel;
  onRequestTilesOfType: (tileType: string) => ITileLinkMetadata[];
}
const useLinkableGeometryTiles = ({ model, onRequestTilesOfType }: IUseLinkableGeometryTilesProps) => {
  // get all tiles of type graph and geometry
  const graphTiles = useCurrent(onRequestTilesOfType(kGraphTileType));
  const geometryTiles = useCurrent(onRequestTilesOfType(kGeometryTileType));
  const linkableTiles = graphTiles.current.concat(geometryTiles.current);

  // add default title if there isn't a title
  return linkableTiles.map((tileInfo, i) => ({ id: tileInfo.id, title: tileInfo.title || `Graph ${i + 1}` }));
};
