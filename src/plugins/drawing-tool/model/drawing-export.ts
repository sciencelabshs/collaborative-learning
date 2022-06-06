import { safeJsonParse } from "../../../utilities/js-utils";
import { ITileExportOptions } from "../../../models/tools/tool-content-info";
import { DrawingToolChange } from "./drawing-types";
import { ImageObjectType } from "../objects/image";
import { DrawingObjectSnapshot, DrawingObjectType } from "../objects/drawing-object";
import { DrawingObjectMSTUnion } from "../components/drawing-object-manager";
import { applyAction, getMembers, getSnapshot, types } from "mobx-state-tree";

interface IDrawingObjectChanges {
  id: string;
  type: string;
  changes: DrawingToolChange[]; // changes that affect this object
  isDeleted?: boolean;          // true if the object has been deleted
}

export function makeSetter(prop: string) {
  return "set" + prop.charAt(0).toUpperCase() + prop.slice(1);
}

export function applyPropertyChange(drawingObject: DrawingObjectType, prop: string, newValue: string | number) {
  const action = makeSetter(prop);
  const objActions = getMembers(drawingObject).actions;
  if (objActions.includes(action)) {
    applyAction(drawingObject, { name: action, args: [newValue] });
  } else {
    console.warn("Trying to update unsupported drawing object", drawingObject?.type, "property", prop);
  }
}

const DrawingContentExport = types.model("DrawingContentExport", {
  type: "Drawing",
  objects: types.array(DrawingObjectMSTUnion)
})
.actions(self => ({
  addObject(object: DrawingObjectType) {
    self.objects.push(object);
  }
}));

export const playbackChanges = (changes: string[], options?: ITileExportOptions) => {
  const objectInfoMap: Record<string, IDrawingObjectChanges> = {};
  const orderedIds: string[] = [];

  const content = DrawingContentExport.create();

  const isExportable = (id: string) => {
    const objInfo = objectInfoMap[id];
    return !!objInfo && !objInfo.isDeleted;
  };

  const exportObject = (id: string, isLast: boolean) => {
    const objInfo = objectInfoMap[id];
    const data = { ...objInfo.changes[0].data } as DrawingObjectSnapshot;
    const object = DrawingObjectMSTUnion.create(data);
    for (let i = 1; i < objInfo.changes.length; ++i) {
      const change = objInfo.changes[i];
      switch (change.action) {
        case "move":
          change.data.forEach(move => {
            if (move.id === id) {
              object.setPosition(move.destination.x, move.destination.y);
            }
          });
          break;
        case "update": {
          const { ids, update: { prop, newValue }} = change.data;
          ids.forEach(_id => {
            if (_id === id) {
              applyPropertyChange(object, prop, newValue);
            }
          });
          break;
        }
      }
    }

    // TODO: This seems specific to exporting, when we are just migrating I don't think
    // we need or want to transform urls 
    if ((object.type === "image") && options?.transformImageUrl) {
      const image = object as ImageObjectType;
      if (image.filename) {
        image.setUrl(options.transformImageUrl(image.url, image.filename));
        image.setFilename(undefined);
      }
    }

    content.addObject(object);
  };

  const exportObjects = () => {
    let lastExportedId: string;
    orderedIds.forEach(id => {
      if (isExportable(id)) {
        lastExportedId = id;
      }
    });
    orderedIds.forEach(id => {
      if (isExportable(id)) {
        exportObject(id, id === lastExportedId);
      }
    });
  };

  // loop through each change, adding it to the set of changes that affect each object
  changes.forEach(changeJson => {
    const change = safeJsonParse<DrawingToolChange>(changeJson);
    if (change) {
      switch (change.action) {
        case "create": {
          const { id, type  } = change.data;
          if (id && type) {
            if (!objectInfoMap[id]) {
              objectInfoMap[id] = { id, type, changes: [change] };
              orderedIds.push(id);
            }
            else {
              console.warn(`exportDrawingTileSpec ignoring creation of duplicate ${type} with id ${id}`);
            }
          }
          break;
        }
        case "update": {
          const { ids } = change.data;
          ids.forEach(id => {
            const objInfo = objectInfoMap[id];
            objInfo && objInfo.changes.push(change);
          });
          break;
        }
        case "move": {
          change.data.forEach(move => {
            const objInfo = objectInfoMap[move.id];
            objInfo && objInfo.changes.push(change);
          });
          break;
        }
        case "delete":{
          change.data.forEach(id => {
            const objInfo = objectInfoMap[id];
            if (objInfo) {
              objInfo.changes.push(change);
              objInfo.isDeleted = true;
            }
          });
          break;
        }
      }
    }
  });

  exportObjects();
  return getSnapshot(content);
};

export const exportDrawingTileSpec = (changes: string[], options?: ITileExportOptions) => {
  // FIXME: this should something like: 
  //   https://www.npmjs.com/package/json-stringify-pretty-compact
  // That will generate a string from the object that is more compact than standard 
  // JSON.stringify. This compact form is close to what the old code did using a
  // string builder.
  return JSON.stringify(playbackChanges(changes, options));
};
