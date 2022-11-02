import { reaction } from "mobx";
import { addDisposer, getType, Instance, types } from "mobx-state-tree";
import { kDataCardToolID, kDefaultLabel, kDefaultLabelPrefix } from "./data-card-types";
import { withoutUndo } from "../../models/history/tree-monitor";
import { IDefaultContentOptions, ITileExportOptions } from "../../models/tools/tool-content-info";
import { getToolTileModel, setTileTitleFromContent } from "../../models/tools/tool-tile";
import { ToolContentModel, ToolMetadataModelType, toolContentModelHooks } from "../../models/tools/tool-types";
import {
  addAttributeToDataSet, addCanonicalCasesToDataSet, addCasesToDataSet, DataSet
} from "../../models/data/data-set";
import { SharedDataSet, SharedDataSetType } from "../../models/shared/shared-data-set";
import { SharedModelType } from "../../models/shared/shared-model";
import { uniqueId, uniqueTitle } from "../../utilities/js-utils";

export function defaultDataSet() {
  // as per slack discussion, default attribute is added automatically
  const dataSet = DataSet.create();
  addAttributeToDataSet(dataSet, { name: kDefaultLabel });
  addCasesToDataSet(dataSet, [{ [kDefaultLabel]: "" }]);
  return dataSet;
}

export function defaultDataCardContent(props?: IDefaultContentOptions): DataCardContentModelType {
  const content = DataCardContentModel.create();
  props?.title && content.setTitle(props.title);
  return content;
}

export const DataCardContentModel = ToolContentModel
  .named("DataCardTool")
  .props({
    type: types.optional(types.literal(kDataCardToolID), kDataCardToolID),
    caseIndex: 0
  })
  .volatile(self => ({
    metadata: undefined as any as ToolMetadataModelType,
    // used as fallback when shared model isn't available
    emptyDataSet: DataSet.create()
  }))
  .views(self => ({
    get title(): string | undefined {
      return getToolTileModel(self)?.title;
    },
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
    get isUserResizable() {
      return true;
    },
  }))
  .views(self => ({
    get dataSet() {
      return self.sharedModel?.dataSet || self.emptyDataSet;
    },
  }))
  .views(self => ({
    get dataSetName(){
      return self.dataSet.name;
    },
    get attributes(){
      return self.dataSet.attributes;
    },
    caseByIndex(index:number){
      return self.dataSet.getCanonicalCaseAtIndex(index);
    },
    get totalCases(){
      return self.dataSet.cases.length;
    },
    allCases(){
      return self.dataSet.getCanonicalCasesAtIndices(0, self.dataSet.cases.length);
    },
    allCasesJsonString(){
      const obj = this.allCases();
      const str = JSON.stringify(obj);
      return str;
    },
    allAttributesJsonString(){
      const obj = self.dataSet.attributes;
      const str = JSON.stringify(obj);
      return str;
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
    attrById(str: string){
      return self.dataSet.attrFromID(str);
    },
    isEmptyCase(caseId: string){
      let attributesWithValues = 0;
      this.existingAttributes().forEach((attr) => {
        const value = self.dataSet.getValue(caseId, attr);
        if (value !== "" && value != null) {
          attributesWithValues++;
        }
      });
      return attributesWithValues === 0;
    },
    exportJson(options?: ITileExportOptions){
      this.allAttributesJsonString();
      return [
        `{`,
        `  "type": "DataCard",`,
        `}`
      ].join("\n");
    }
  }))
  .actions(self => toolContentModelHooks({
    doPostCreate(metadata: ToolMetadataModelType){
      self.metadata = metadata;
    }
  }))
  .actions(self => ({
    afterAttach() {
      // Monitor our parents and update our shared model when we have a document parent
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
      // reaction/effect
      ({sharedModelManager, sharedDataSet, tileSharedModels}) => {
        if (!sharedModelManager?.isReady) {
          // We aren't added to a document yet so we can't do anything yet
          return;
        }

        if (sharedDataSet && tileSharedModels?.includes(sharedDataSet)) {
          // The shared model has already been registered by a client, but as the
          // "owner" of the data, we synchronize it with our local content.
          // if (!self.importedDataSet.isEmpty) {
          //   sharedDataSet.dataSet = DataSet.create(getSnapshot(self.importedDataSet));
          //   self.clearImportedDataSet();
          // }
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
      },
      {name: "sharedModelSetup", fireImmediately: true}));
    },
    updateAfterSharedModelChanges(sharedModel?: SharedModelType) {
      if (self.caseIndex >= self.totalCases) {
        this.setCaseIndex(self.totalCases - 1);
      }
    },
    setTitle(title: string) {
      setTileTitleFromContent(self, title);
    },
    setCaseIndex(caseIndex: number) {
      // current case is serialized, but navigation is not undoable
      withoutUndo();
      self.caseIndex = caseIndex;
    },
    setAttName(attrId: string, name: string){
     self.dataSet.setAttributeName(attrId, name);
    },
    setAttValue(caseId: string, attrId: string, val: string){
      self.dataSet.setCanonicalCaseValues([
        { __id__: caseId, [attrId]: val }
      ]);
    },
    addNewCaseFromAttrKeys(atts: string[]){
      const obj = atts.reduce((o, key) => Object.assign(o, {[key]: ""}), {});
      addCanonicalCasesToDataSet(self.dataSet, [obj]);
    },
    addNewAttr(){
      self.dataSet.addAttributeWithID({
        id: uniqueId(),
        name: uniqueTitle(kDefaultLabelPrefix, name => !self.dataSet.attrFromName(name))
      });

      const casesArr = self.allCases().map(c => c?.__id__);
      const attrsArr = self.existingAttributes();

      casesArr.forEach((caseId) => {
        if (caseId){
          attrsArr.forEach((attr) => {
            const notSet = self.dataSet.getValue(caseId, attr) === undefined;
            if (notSet){
              this.setAttValue(caseId, attr, "");
            }
          });
        }
      });
    }
  }));

export interface DataCardContentModelType extends Instance<typeof DataCardContentModel> {}
