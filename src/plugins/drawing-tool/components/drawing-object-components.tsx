import { SnapshotIn, types } from "mobx-state-tree";
import React from "react";
import { DrawingObjectType } from "../model/drawing-objects2";
import { DrawingComponentType } from "../objects/drawing-object-types";
import { EllipseComponent, EllipseObject } from "../objects/ellipse";
import { ImageComponent, ImageObject } from "../objects/image";
import { LineComponent, LineObject } from "../objects/line";
import { RectangleComponent, RectangleObject } from "../objects/rectangle";
import { VectorComponent, VectorObject } from "../objects/vector";

const gDrawingObjectComponents: Record<string, DrawingComponentType | undefined> = {
  "line": LineComponent,
  "vector": VectorComponent,
  "rectangle": RectangleComponent,
  "ellipse": EllipseComponent,
  "image": ImageComponent
};

export function getDrawingObjectComponent(drawingObject: DrawingObjectType) {
  return gDrawingObjectComponents[drawingObject.type];
}

type HandleObjectHover = (e: MouseEvent|React.MouseEvent<any>, obj: DrawingObjectType, hovering: boolean) => void;

export function renderDrawingObject(drawingObject: DrawingObjectType, handleHover?: HandleObjectHover) {
  const DrawingObjectComponent = getDrawingObjectComponent(drawingObject);
  if (!DrawingObjectComponent) return null;
  return <DrawingObjectComponent key={drawingObject.id} model={drawingObject} handleHover={handleHover}/>;
}

// FIXME: this is temporary, to support plugin based objects
// we can't use a static union. Also if we keep it here the name of this file
// isn't correct.
export type DrawingObjectSnapshotUnion = 
  SnapshotIn<typeof LineObject> |
  SnapshotIn<typeof VectorObject> |
  SnapshotIn<typeof RectangleObject> |
  SnapshotIn<typeof EllipseObject> |
  SnapshotIn<typeof ImageObject>;

// FIXME: This is temporary it will need to be dynamic
// I'm also not sure if MST will be smart enough to figure out the 
// type based on the type field (especially since it is optional)
export const DrawingObjectMSTUnion = 
  types.union(LineObject, VectorObject, RectangleObject, EllipseObject, ImageObject);
