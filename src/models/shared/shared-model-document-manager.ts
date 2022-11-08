import { action, computed, makeObservable, observable } from "mobx";
import { getParentOfType, hasParentOfType, IAnyStateTreeNode } from "mobx-state-tree";
import { DocumentContentModelType } from "../document/document-content";
import { SharedModelType } from "./shared-model";
import { ISharedModelManager, SharedModelUnion } from "./shared-model-manager";
import { TileModel } from "../tiles/tile-model";


function getTileModel(tileContentModel: IAnyStateTreeNode) {
  if (!hasParentOfType(tileContentModel, TileModel)) {
    // we aren't attached in the right place yet
    return undefined;
  }
  return getParentOfType(tileContentModel, TileModel);
}

export interface ISharedModelDocumentManager extends ISharedModelManager {
  setDocument(document: DocumentContentModelType): void;
}

export class SharedModelDocumentManager implements ISharedModelDocumentManager {
  document: DocumentContentModelType | undefined = undefined;

  constructor() {
    makeObservable(this, {
      document: observable,
      isReady: computed,
      setDocument: action,
      findFirstSharedModelByType: action,
      addTileSharedModel: action,
      removeTileSharedModel: action
    });
  }

  get isReady() {
    return !!this.document;
  }

  setDocument(document: DocumentContentModelType) {
    this.document = document;
  }

  findFirstSharedModelByType<IT extends typeof SharedModelUnion>(
    sharedModelType: IT, providerId?: string): IT["Type"] | undefined {
    if (!this.document) {
      console.warn("findFirstSharedModelByType has no document");
    }
    return this.document?.getFirstSharedModelByType(sharedModelType, providerId);
  }

  getSharedModelsByType<IT extends typeof SharedModelUnion>(type: string): IT["Type"][] {
    return this.document?.getSharedModelsByType<IT>(type) || [];
  }

  addTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: SharedModelType, isProvider = false): void {
    if (!this.document) {
      console.warn("addTileSharedModel has no document. this will have no effect");
      return;
    }

    // add this tile to the sharedModel entry
    const tile = getTileModel(tileContentModel);
    if (!tile) {
      console.warn("addTileSharedModel can't find the tile");
      return;
    }

      // assign an indexOfType if necessary
      if (sharedModel.indexOfType < 0) {
        const usedIndices = new Set<number>();
        const sharedModels = this.document.getSharedModelsByType(sharedModel.type);
        sharedModels.forEach(model => {
          if (model.indexOfType >= 0) {
            usedIndices.add(model.indexOfType);
          }
        });
        for (let i = 1; sharedModel.indexOfType < 0; ++i) {
          if (!usedIndices.has(i)) {
            sharedModel.setIndexOfType(i);
            break;
          }
        }
      }

    // register it with the document if necessary.
    // This won't re-add it if it is already there
    const sharedModelEntry = this.document.addSharedModel(sharedModel);

    // If the sharedModel was added before we don't need to do anything
    if (sharedModelEntry.tiles.includes(tile)) {
      return;
    }

    sharedModelEntry.addTile(tile, isProvider);

    // When a shared model changes updateAfterSharedModelChanges is called on
    // the tile content model automatically by the tree monitor. However when
    // the list of shared models is changed like here addTileSharedModel, the
    // tree monitor doesn't pick that up, so we must call it directly.
    tileContentModel.updateAfterSharedModelChanges(sharedModel);
  }

  // This is not an action because it is deriving state.
  getTileSharedModels(tileContentModel: IAnyStateTreeNode): SharedModelType[] {
    if (!this.document) {
      console.warn("getTileSharedModels has no document");
      return [];
    }

    // add this tile to the sharedModel entry
    const tile = getTileModel(tileContentModel);
    if (!tile) {
      console.warn("getTileSharedModels can't find the tile");
      return [];
    }

    const sharedModels: SharedModelType[] = [];
    for(const sharedModelEntry of this.document.sharedModelMap.values()) {
      if (sharedModelEntry.tiles.includes(tile)) {
        sharedModels.push(sharedModelEntry.sharedModel);
      }
    }
    return sharedModels;
  }

  getSharedModelTileIds(sharedModel?: SharedModelType): string[] {
    const entry = sharedModel?.id && this.document?.sharedModelMap.get(sharedModel.id);
    return entry ? Array.from(entry.tiles.map(tile => tile.id)) : [];
  }

  removeTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: SharedModelType): void {
    if (!this.document) {
      console.warn("removeTileSharedModel has no document");
      return;
    }

    const tile = getTileModel(tileContentModel);
    if (!tile) {
      console.warn("removeTileSharedModel can't find the tile");
      return;
    }

    const sharedModelEntry = this.document.sharedModelMap.get(sharedModel.id);
    if (!sharedModelEntry) {
      console.warn(`removeTileSharedModel can't find sharedModelEntry for sharedModel: ${sharedModel.id}`);
      return;
    }

    sharedModelEntry.removeTile(tile);
  }
}
