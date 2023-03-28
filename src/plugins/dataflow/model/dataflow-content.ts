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
import { addAttributeToDataSet, addCasesToDataSet, DataSet, ICase } from "../../../models/data/data-set";
import { updateSharedDataSetColors } from "../../../models/shared/shared-data-set-colors";
import { uniqueId } from "../../../utilities/js-utils";
import { SharedModelType } from "src/models/shared/shared-model";

export const kDataflowTileType = "Dataflow";

export function defaultDataflowContent(): DataflowContentModelType {
  return DataflowContentModel.create();
}

export const kDataflowDefaultHeight = 480;
export const kDefaultLabel = "Dataflow Node";


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
    emptyDataSet: DataSet.create()
  }))
  .views(self => ({
    get sharedModel() {
      const sharedModelManager = self.tileEnv?.sharedModelManager;
      // Perhaps we should pass the type to getTileSharedModel, so it can return the right value
      // just like findFirstSharedModelByType does
      //
      // For now we are checking the type ourselves, and we are assuming the shared model we want
      // is the first one.
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
    }
  }))
  .views(self => ({
    get title() {
      return getTileModel(self)?.title;
    },
    get isUserResizable() {
      return true;
    },
    get dataSet() {
      return self.sharedModel?.dataSet || self.emptyDataSet;
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
    existingAttributesWithNames(){
      return self.dataSet.attributes.map((a) => {
        return { "attrName": a.name, "attrId": a.id };
      });
    },
    existingAttributes(){
      return self.dataSet.attributes.map((a) => {
        return a.id;
      });
    },
  }))
  .actions(self => tileModelHooks({
    doPostCreate(metadata: ITileMetadataModel){
      self.metadata = metadata;
    }
  }))
  .actions(self => ({
    afterAttach() { //
      // Monitor our parents and update our shared model when we have a document parent
      addDisposer(self, reaction(() => {
        // disposers call the function passed to it when model is disposed
        // and here we pass a reaction, which is a mobx thing that watches the stuff in the first argument
        // it calls second argument when first is done
        // looking in the tileEnv for the shared modelManager - "environment" is a mobx context,
        // but must be set at root of tree
        // tile env proxies the actual mechanism
        const sharedModelManager = self.tileEnv?.sharedModelManager;

        // collecting the stats on current sharedModels here so we can pass on to reaction on 119
        const sharedDataSet = sharedModelManager?.isReady
          // TODO, where is this coming from, might not want it id by any "metadata"
          ? sharedModelManager?.findFirstSharedModelByType(SharedDataSet, self.metadata.id)
          : undefined;

        const tileSharedModels = sharedModelManager?.isReady
          ? sharedModelManager?.getTileSharedModels(self)
          : undefined;

        return { sharedModelManager, sharedDataSet, tileSharedModels };
      },
      // reaction/effect ("second argument" above), a mobx reaction watches the model
      // and "reacts" there are various flavors, e.g.
      // autorun, when, (what we are watching, what we do if what watching changes)
      ({sharedModelManager, sharedDataSet, tileSharedModels}) => {
        if (!sharedModelManager?.isReady) {
          // We aren't added to a document yet so we can't do anything yet
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

         // SharedDataSet.providerId (might be a table, in the case of a new table)
              // DataSet

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
    addNewCaseFromAttrKeys(atts: string[], caseId: string, beforeId?: string){
      if (caseId){
        const obj = atts.reduce((o, key) => Object.assign(o, {[key]: ""}), {});
        const newCases = cloneDeep([obj]) as ICase[];
        newCases.forEach((aCase) => {
          if (!aCase.__id__) {
            aCase.__id__ = caseId;
          }
        });
        self.dataSet.addCanonicalCasesWithIDs(newCases);
      }
    },
    setAttrName(attrId: string, name: string){
      self.dataSet.setAttributeName(attrId, name);
    },
    setAttrValue(caseId: string, attrId: string, val: string){
       self.dataSet.setCanonicalCaseValues([
         { __id__: caseId, [attrId]: val }
       ]);
    },
    updateAfterSharedModelChanges(sharedModel?: SharedModelType){
      //do nothing
    },

    addNewAttrFromNode(nodeId: number, nodeName: string){ //if already an attribute with the same nodeId,else write
      const dataSetAttributes = self.dataSet.attributes;
      let foundFlag = false;

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
    }
  }));

export type DataflowContentModelType = Instance<typeof DataflowContentModel>;
