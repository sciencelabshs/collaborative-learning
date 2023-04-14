import { types, Instance, applySnapshot, getSnapshot, addDisposer, getType } from "mobx-state-tree";
import { reaction } from "mobx";
import { cloneDeep} from "lodash";
import stringify from "json-stringify-pretty-compact";
import { DataflowProgramModel } from "./dataflow-program-model";
import { ITileExportOptions } from "../../../models/tiles/tile-content-info";
import { ITileMetadataModel } from "../../../models/tiles/tile-metadata";
import { tileModelHooks } from "../../../models/tiles/tile-model-hooks";
import { TileContentModel } from "../../../models/tiles/tile-content";
import { DEFAULT_DATA_RATE } from "./utilities/node";
import { getTileModel, setTileTitleFromContent } from "../../../models/tiles/tile-model";
import { SharedDataSet, kSharedDataSetType, SharedDataSetType  } from "../../../models/shared/shared-data-set";
import { addAttributeToDataSet, addCasesToDataSet, DataSet } from "../../../models/data/data-set";
import { updateSharedDataSetColors } from "../../../models/shared/shared-data-set-colors";
import { uniqueId } from "../../../utilities/js-utils";
import { SharedModelType } from "../../../models/shared/shared-model";
import { getTileContentById } from "../../../utilities/mst-utils";

export const kDataflowTileType = "Dataflow";

export function defaultDataflowContent(): DataflowContentModelType {
  return DataflowContentModel.create();
}

export const kDataflowDefaultHeight = 480;
export const kDefaultLabel = "Dataflow Node";
export const kTimeAttributeCount = 2; //# of time attributes (currently TimeQuantized + TimeActual)

export function defaultDataSet() {
  const dataSet = DataSet.create();
  addAttributeToDataSet(dataSet, { name: kDefaultLabel });
  addCasesToDataSet(dataSet, [{ [kDefaultLabel]: "" }]);
  return dataSet;
}

const ProgramZoom = types.model({
  dx: types.number,
  dy: types.number,
  scale: types.number,
});
export type ProgramZoomType = typeof ProgramZoom.Type;
export const DEFAULT_PROGRAM_ZOOM = { dx: 0, dy: 0, scale: 1 };

export const DataflowContentModel = TileContentModel
  .named("DataflowTool")
  .props({
    type: types.optional(types.literal(kDataflowTileType), kDataflowTileType),
    program: types.optional(DataflowProgramModel, getSnapshot(DataflowProgramModel.create())),
    programDataRate: DEFAULT_DATA_RATE,
    programZoom: types.optional(ProgramZoom, DEFAULT_PROGRAM_ZOOM),
  })
  .volatile(self => ({
    metadata: undefined as any as ITileMetadataModel,
    emptyDataSet: DataSet.create(),
    // Used to force linkedDataSets() to update.(similar to geometry-content.ts)
    updateSharedModels: 0,
  }))
  .views(self => ({
    get sharedModel() {
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      const firstSharedModel = sharedModelManager?.getTileSharedModels(self)?.[0];
      if (!firstSharedModel || getType(firstSharedModel) !== SharedDataSet) {
        return undefined;
      }
      return firstSharedModel as SharedDataSetType;
    },
    programWithoutRecentValues() {
      const { values, ...rest } = getSnapshot(self.program);
      const castedValues = values as Record<string, any>;
      const newValues: Record<string, any> = {};
      if (values) {
        Object.keys(castedValues).forEach((key: string) => {
          const { recentValues, ...other } = castedValues[key];
          newValues[key] = { ...other };
        });
      }
      return { values: newValues, ...rest };
    }
  }))
  .views(self => ({
    get dataSet(){
      return self.sharedModel?.dataSet || self.emptyDataSet;
    },
    ////added
    get linkedDataSets(): SharedDataSetType[] {
      // eslint-disable-next-line no-unused-expressions
      self.updateSharedModels;
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      const foundSharedModels = sharedModelManager?.isReady
        ? sharedModelManager.getTileSharedModels(self) as SharedDataSetType[]
        : [];
      return foundSharedModels;
    },
    ////
  }))
  .views(self => ({
    get title() {
      return getTileModel(self)?.title;
    },
    get isUserResizable() {
      return true;
    },
    exportJson(options?: ITileExportOptions) {
      const zoom = getSnapshot(self.programZoom);
      return [
        `{`,
        `  "type": "Dataflow",`,
        `  "programDataRate": ${self.programDataRate},`,
        `  "programZoom": {`,
        `    "dx": ${zoom.dx},`,
        `    "dy": ${zoom.dy},`,
        `    "scale": ${zoom.scale}`,
        `  },`,
        `  "program": ${stringify(self.programWithoutRecentValues())}`,
        `}`
      ].join("\n");
    },
    /////added
    get isLinked(){
      return self.linkedDataSets.length > 0;
    },
    get linkedTableIds() {
      return self.linkedDataSets.map(link => link.providerId);
    },
    isLinkedToTable(tableId: string) {
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      const isTableIdFound = self.linkedDataSets.some(link => { //link is the shared model
        return sharedModelManager?.getSharedModelTileIds(link).includes(tableId);
      });
      return isTableIdFound;
    },
    //////
  }))
  .actions(self => tileModelHooks({
    doPostCreate(metadata: ITileMetadataModel) {
      self.metadata = metadata;
    }
  }))
  .actions(self => ({
    afterAttach() { //
      addDisposer(self, reaction(() => {
        const sharedModelManager = self.tileEnv?.sharedModelManager;
        const sharedDataSet = sharedModelManager?.isReady
          ? sharedModelManager?.findFirstSharedModelByType(SharedDataSet, self.metadata.id)
          : undefined;

        const tileSharedModels = sharedModelManager?.isReady
          ? sharedModelManager?.getTileSharedModels(self)
          : undefined;

        return { sharedModelManager, sharedDataSet, tileSharedModels };
      },
      ({sharedModelManager, sharedDataSet, tileSharedModels}) => {
        if (!sharedModelManager?.isReady) {
          return;
        }

        if (sharedDataSet && tileSharedModels?.includes(sharedDataSet)) {
          // The shared model has already been registered by a client, but as the
          // "owner" of the data, we synchronize it with our local content.
        }
        else {
          if (!sharedDataSet) {
            // The document doesn't have a shared model yet
            const dataSet = defaultDataSet();
            sharedDataSet = SharedDataSet.create({ providerId: self.metadata.id, dataSet });
          }

          // Add the shared model to both the document and the tile
          sharedModelManager.addTileSharedModel(self, sharedDataSet);
        }

        // update the colors
        const dataSets = sharedModelManager.getSharedModelsByType(kSharedDataSetType) as SharedDataSetType[];
        updateSharedDataSetColors(dataSets);
      },
      {name: "sharedModelSetup", fireImmediately: true}));
    },
    setProgram(program: any) {
      if (program) {
        applySnapshot(self.program, cloneDeep(program));
      }
    },
    setTitle(title: string) {
      setTileTitleFromContent(self, title);
    },
    setProgramDataRate(dataRate: number) {
      self.programDataRate = dataRate;
    },
    setProgramZoom(dx: number, dy: number, scale: number) {
      self.programZoom.dx = dx;
      self.programZoom.dy = dy;
      self.programZoom.scale = scale;
    },
    updateAfterSharedModelChanges(sharedModel?: SharedModelType){
      //do nothing
    },
    addNewAttrFromNode(nodeId: number, nodeName: string){
      //if already an attribute with the same nodeId do nothing, else write
      // console.log("dataflow-content.ts > addNewAttrFromNode \n nodeId", nodeId, "nodeName:", nodeName);

      const dataSetAttributes = self.dataSet.attributes;
      let foundFlag = false;


      // console.log("objectKeys datasetAttributes:", Object.keys(dataSetAttributes));

      for (let i = 0; i < Object.keys(dataSetAttributes).length ; i++){ //look in dataSet.attributes for each Id
        const idInDataSet = dataSetAttributes[i].id;
        const index = idInDataSet.indexOf("*");
        const stringAfterIndex = idInDataSet.substring(index+1);
        if (nodeId.toString() === stringAfterIndex)foundFlag = true;
      }

      if (!foundFlag) {
        const newAttributeId = uniqueId() + "*" + nodeId;
        self.dataSet.addAttributeWithID({
          id: newAttributeId,
          name: `Dataflow-${nodeName}_${nodeId}`
        });
      }
    },
    // this may be implemented if we change to preserve attributes accross runs
    removeAttributesInDatasetMissingInTile(attribute: string){
      const index = attribute.indexOf("*");
      const stringAfterIndex = attribute.substring(index + 1);
      let foundFlag = false;
      const { nodes } = getSnapshot(self.program);
      const castedNodes = nodes as Record<string, any>;
      const castedNodesIdArr = Object.keys(castedNodes);
      for (let i = 0; i < castedNodesIdArr.length; i++){
        const idInTile = castedNodesIdArr[i];
        if (idInTile === stringAfterIndex) foundFlag = true;
      }
      if (!foundFlag){
        self.dataSet.removeAttribute(attribute);
      }
    },
    //TODO
    addLinkedTable(tableId: string) {  //tableID is table we linked it to
      console.log("dataflow-content.ts > 🔨 addLinkedTable with tableId", tableId);
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      if (sharedModelManager?.isReady && !self.isLinkedToTable(tableId)) {
        const sharedTable = sharedModelManager.findFirstSharedModelByType(SharedDataSet, tableId);
        // console.log("dataflow-content.ts > 🔨 addLinkedTable > sharedTable", sharedTable);
        //sever the connection between table -> sharedData set
        // console.log("dataflow-content.ts > self:", self);

        //need to get tableTile contents given a tableId
        const tableTile = getTileContentById(self, tableId);
        // console.log("dataflow-content.ts > tableTile:", tableTile);
        sharedTable && sharedModelManager.removeTileSharedModel(tableTile, sharedTable);
        //,connect table -> dataflow Dataset
        self.sharedModel && sharedModelManager.addTileSharedModel(tableTile, self.sharedModel);
        //instead we want to pass table content
      }
      else {
        console.warn("GeometryContent.addLinkedTable unable to link table");
      }
    },

    removeLinkedTable(tableId: string) {
      // console.log("dataflow-content.ts > removeLinkedTable with tableId", tableId);
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      if (sharedModelManager?.isReady && self.isLinkedToTable(tableId)) {
        const sharedTable = sharedModelManager.findFirstSharedModelByType(SharedDataSet, tableId);
        sharedTable && sharedModelManager.removeTileSharedModel(self, sharedTable);
        // self.forceSharedModelUpdate();
      }
      else {
        console.warn("GeometryContent.addLinkedTable unable to unlink table");
      }
    }

  }));

export type DataflowContentModelType = Instance<typeof DataflowContentModel>;
