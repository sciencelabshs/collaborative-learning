import React from "react";
import { DrawingObjectType, DrawingTool, IDrawingLayer } from "../objects/drawing-object";

export class SelectionDrawingTool extends DrawingTool {
  constructor(drawingLayer: IDrawingLayer) {
    super(drawingLayer);
  }

  public handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const drawingLayerView = this.drawingLayer;
    const addToSelectedObjects = e.ctrlKey || e.metaKey || e.shiftKey;
    const start = this.drawingLayer.getWorkspacePoint(e);
    if (!start) return;
    drawingLayerView.startSelectionBox(start);

    const handleMouseMove = (e2: MouseEvent) => {
      e2.preventDefault();
      const p = this.drawingLayer.getWorkspacePoint(e2);
      if (!p) return;
      drawingLayerView.updateSelectionBox(p);
    };
    const handleMouseUp = (e2: MouseEvent) => {
      e2.preventDefault();
      drawingLayerView.endSelectionBox(addToSelectedObjects);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  public handleObjectClick(e: React.MouseEvent<HTMLDivElement>, obj: DrawingObjectType) {
    let selectedObjects = this.drawingLayer.getSelectedObjects();
    const index = selectedObjects.indexOf(obj);
    if (index === -1) {
      if (e.shiftKey || e.metaKey){
        selectedObjects.push(obj);
      }
      else {
        selectedObjects = [obj];
      }
    }
    else {
      if (!(e.shiftKey||e.metaKey)){
        selectedObjects.splice(index, 1);
      }
    }
    this.drawingLayer.setSelectedObjects(selectedObjects);
  }
}
