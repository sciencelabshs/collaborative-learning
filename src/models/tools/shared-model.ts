import { IAnyStateTreeNode, Instance, types } from "mobx-state-tree";
import { uniqueId } from "../../utilities/js-utils";
// TODO: This is a circular import, tool-content-info also imports SharedModel from here
// This can be fixed by splitting shared-models into 2 files. One of those files will have
// SharedModel, SharedModelType in it. Those objects don't need tool-content-info, and it is 
// those objects that are used by tool-content-info
// This same refactoring can be applied to tool-types to eliminate a circular import there.
import { getSharedModelClasses, getSharedModelInfoByType } from "./tool-content-info";

export const kUnknownSharedModel = "unknownSharedModel";

// Generic "super class" of all shared models
export const SharedModel = types.model("SharedModel", {
  // The type field has to be optional because the typescript type created from the sub models
  // is an intersection ('&') of this SharedModel and the sub model.  If this was just:
  //   type: types.string
  // then typescript has errors because the intersection logic means the type field is
  // required when creating a shared model. And we don't want to require the
  // type when creating the shared model. This might be solvable by using the
  // mst snapshot preprocessor to add the type. 
  //
  // It could be changed to
  //   type: types.maybe(types.string)
  // Because of the intersection it would still mean the sub models would do the right thing,
  // but if someone looks at this definition of SharedModel, it implies the wrong thing.
  // It might also cause problems when code is working with a generic of SharedModel
  // that code couldn't assume that `model.type` is defined.
  //
  // Since this is optional, it needs a default value, and Unknown seems like the
  // best option for this.
  //
  // Perhaps there is some better way to define this so that there would be an error
  // if a sub type does not override it.
  type: types.optional(types.string, kUnknownSharedModel),

  // if not provided, will be generated
  id: types.optional(types.identifier, () => uniqueId()),
});

export interface SharedModelType extends Instance<typeof SharedModel> {}

export function sharedModelFactory(snapshot: any) {
  const sharedModelType: string | undefined = snapshot?.type;
  return sharedModelType && getSharedModelInfoByType(sharedModelType)?.modelClass || UnknownSharedModel;
}

export const SharedModelUnion = types.late<typeof SharedModel>(() => {
  const sharedModels = getSharedModelClasses();
  return types.union({ dispatcher: sharedModelFactory }, ...sharedModels) as typeof SharedModel;
});

// The UnknownContentModel has to be defined in this tool-types module because it both
// "extends" ToolContentModel and UnknownContentModel is used by the toolFactory function
// above. Because of this it is a kind of circular dependency.
// If UnknownContentModel is moved to its own module this circular dependency causes an error.
// If they are in the same module then this isn't a problem.
//
// There is a still an "unknown-content" module, so that module can
// register the tool without adding a circular dependency on tool-content-info here.
const _UnknownSharedModel = SharedModel
  .named("UnknownSharedModel")
  .props({
    type: types.optional(types.literal(kUnknownSharedModel), kUnknownSharedModel),
    original: types.maybe(types.string)
  });

export const UnknownSharedModel = types.snapshotProcessor(_UnknownSharedModel, {
  // Maybe we can type the snapshot better?
  preProcessor(snapshot: any) {
    const type = snapshot?.type;
    return type && (type !== kUnknownSharedModel)
            ? {
              type: kUnknownSharedModel,
              original: JSON.stringify(snapshot)
            }
            : snapshot;
  },

  postProcessor(snapshot: any) {
    return JSON.parse(snapshot.original);
  }
});

/**
 * An instance of this interface should be provided to tiles so they can interact
 * with shared models.
 */
export interface ISharedModelManager {
  /**
   * The manager might be available, but is not ready to be used yet.
   */
  get isReady(): boolean;
  
  /**
   * Find the shared model at the container level. If the tile wants to use this
   * shared model it should call `setTileSharedModel` to save a reference to it.
   * The container needs to know which tiles reference which shared models so it
   * can update them when the shared model changes.
   *
   * @param sharedModelType the MST model "class" of the shared model
   */
  findFirstSharedModelByType<IT extends typeof SharedModelUnion>(sharedModelType: IT): IT["Type"] | undefined;

  /**
   * Get the shared model of this tile. They are labeled so a tile can have
   * multiple shared models.
   *
   * @param tileContentModel normally this would be `self` when called by a tile
   * @param label a string labeling this shared model
   */ 
  getTileSharedModel(tileContentModel: IAnyStateTreeNode, label: string): SharedModelType | undefined;

  /**
   * Tiles should call this after finding or creating shared model they want to
   * use. If this is a new shared model instance, it will be added to the
   * container level so other tiles can find it.
   *
   * It is important that tiles call this even if they find an existing shared
   * model with `findFirstSharedModelByType`. The container needs to know which
   * tiles are referencing which shared models.
   *
   * @param tileContentModel normally this would be `self` when called by a tile
   * @param label a string labeling this shared model
   * @param sharedModel a new shared model instance or one returned by
   * `findFirstSharedModelByType`
   */
  setTileSharedModel(tileContentModel: IAnyStateTreeNode, label: string, sharedModel: SharedModelType): void;
}
