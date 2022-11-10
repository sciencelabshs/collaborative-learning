import { addDisposer, onAction } from "mobx-state-tree";
import {
  createDrawingContent, defaultDrawingContent,
  DrawingContentModelSnapshot, DrawingToolMetadataModel
} from "./drawing-content";
import { kDrawingTileType } from "./drawing-types";
import { DefaultToolbarSettings } from "./drawing-basic-types";
import { AppConfigModel } from "../../../models/stores/app-config-model";
import { ImageObject } from "../objects/image";
import { RectangleObject, RectangleObjectSnapshot, RectangleObjectSnapshotForAdd,
  RectangleObjectType } from "../objects/rectangle";
import { computeStrokeDashArray } from "../objects/drawing-object";
import { Logger } from "../../../lib/logger";
import { LogEventName } from "../../../lib/logger-types";

jest.mock("../../../lib/logger", () => {
  return {
    ...(jest.requireActual("../../../lib/logger") as any),
    Logger: {
      logTileChange: jest.fn()
    }
  };
});
const logTileChange = Logger.logTileChange as jest.Mock;

describe("computeStrokeDashArray", () => {
  it("should return expected results", () => {
    expect(computeStrokeDashArray()).toBe("");
    expect(computeStrokeDashArray("dotted")).toBe("0,0");
    expect(computeStrokeDashArray("dotted", 0)).toBe("0,0");
    expect(computeStrokeDashArray("dotted", 1)).toBe("1,1");
    expect(computeStrokeDashArray("dashed")).toBe("0,0");
    expect(computeStrokeDashArray("dashed", 0)).toBe("0,0");
    expect(computeStrokeDashArray("dashed", 1)).toBe("3,3");
  });
});

describe('defaultDrawingContent', () => {
  it('should return content with no options', () => {
    const content = defaultDrawingContent();
    expect(content.type).toBe(kDrawingTileType);
    expect(content.stamps).toEqual([]);
    expect(content.objects).toEqual([]);
  });
  it('should return content with optional stamps', () => {
    const stamps = [{ url: "my/stamp/url", width: 10, height: 10 }];
    const appConfig = AppConfigModel.create({ config: { stamps } as any });
    const content = defaultDrawingContent({ appConfig });
    expect(content.type).toBe(kDrawingTileType);
    expect(content.stamps).toEqual(stamps);
    expect(content.objects).toEqual([]);
  });
});

describe("DrawingContentModel", () => {

  function createDrawingContentWithMetadata(options?: DrawingContentModelSnapshot) {
    const model = createDrawingContent(options);
    const metadata = DrawingToolMetadataModel.create({ id: "drawing-1" });
    model.doPostCreate!(metadata);
    addDisposer(model, onAction(model, (call) => {
      model.onTileAction!(call);
    }));
    return model;
  }

  const mockSettings = {
    fill: "#666666",
    stroke: "#888888",
    strokeDashArray: "3,3",
    strokeWidth: 5
  };
  const baseRectangleSnapshot: RectangleObjectSnapshotForAdd = {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    ...mockSettings,
  };

  it("accepts default arguments on creation", () => {
    const model = createDrawingContentWithMetadata();
    expect(model.type).toBe(kDrawingTileType);
    expect(model.objects).toEqual([]);
    expect(model.isUserResizable).toBe(true);
    expect(model.selectedButton).toBe("select");
    expect(model.isSelectedButton("select")).toBe(true);
  });

  it("imports the drawing tool import format", () => {
    const { fill, stroke, strokeDashArray, strokeWidth} = mockSettings;
    const model = createDrawingContentWithMetadata({
      type: "Drawing", objects: [
        { type: "rectangle", x: 10, y: 10, width: 100, height: 100,
          fill, stroke, strokeDashArray, strokeWidth } as RectangleObjectSnapshot
      ]
    });
    expect(model.type).toBe(kDrawingTileType);
    expect(model.objects.length).toBe(1);
    expect(model.objects[0].type).toBe("rectangle");
  });

  it("can reset the tool button", () => {
    const model = createDrawingContentWithMetadata();
    model.setSelectedButton("vector");
    expect(model.selectedButton).toBe("vector");
    model.setSelectedButton("vector");
    expect(model.isSelectedButton("vector")).toBe(true);
    model.reset();
    expect(model.selectedButton).toBe("select");
    expect(model.isSelectedButton("select")).toBe(true);
  });

  it("can manage the toolbar settings", () => {
    const { fill, stroke, strokeDashArray, strokeWidth} = mockSettings;
    const model = createDrawingContentWithMetadata();
    const defaultSettings = {
      stroke: DefaultToolbarSettings.stroke,
      fill: DefaultToolbarSettings.fill,
      strokeDashArray: DefaultToolbarSettings.strokeDashArray,
      strokeWidth: DefaultToolbarSettings.strokeWidth
    };
    expect(model.toolbarSettings).toEqual(defaultSettings);
    model.setStroke(stroke, model.selectedIds);
    expect(model.toolbarSettings).toEqual({ ...defaultSettings, stroke });
    model.setFill(fill, model.selectedIds);
    expect(model.toolbarSettings).toEqual({ ...defaultSettings, fill, stroke });
    model.setStrokeDashArray(strokeDashArray, model.selectedIds);
    expect(model.toolbarSettings).toEqual({ ...defaultSettings, fill, stroke, strokeDashArray });
    model.setStrokeWidth(strokeWidth, model.selectedIds);
    expect(model.toolbarSettings).toEqual({ ...defaultSettings, fill, stroke, strokeDashArray, strokeWidth });
  });

  it("can delete a set of selected drawing objects", () => {
    const model = createDrawingContentWithMetadata();

    logTileChange.mockReset();

    const rectSnapshot1: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"a", x:0, y:0};
    model.addObject(rectSnapshot1);

    const rectSnapshot2: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"b", x:20, y:20};
    model.addObject(rectSnapshot2);

    // delete does nothing if nothing is selected
    expect(model.objects.length).toBe(2);
    model.deleteObjects(model.selectedIds);
    expect(model.objects.length).toBe(2);

    model.setSelection(["a", "b"]);
    expect(model.hasSelectedObjects).toBe(true);

    model.deleteObjects(model.selectedIds);
    expect(model.objects.length).toBe(0);
    // Note: Normally the path will start at the root of the document, but for this test we
    // are mocking the onTileAction so the path is just blank
    expect(logTileChange).toHaveBeenNthCalledWith(1,
      LogEventName.DRAWING_TOOL_CHANGE, "addObject", { args: [ {
        fill: "#666666",
        height: 10,
        id: "a",
        stroke: "#888888",
        strokeDashArray: "3,3",
        strokeWidth: 5,
        type: "rectangle",
        width: 10,
        x: 0,
        y: 0
      } ], path: ""}, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(2,
      LogEventName.DRAWING_TOOL_CHANGE, "addObject", { args: [ {
        fill: "#666666",
        height: 10,
        id: "b",
        stroke: "#888888",
        strokeDashArray: "3,3",
        strokeWidth: 5,
        type: "rectangle",
        width: 10,
        x: 20,
        y: 20
      } ], path: ""}, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(3,
      LogEventName.DRAWING_TOOL_CHANGE, "deleteObjects", { args: [ [] ], path: ""}, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(4,
      LogEventName.DRAWING_TOOL_CHANGE, "setSelection", { args: [ ["a", "b"] ], path: ""}, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(5,
      LogEventName.DRAWING_TOOL_CHANGE, "deleteObjects", { args: [ ["a", "b"] ], path: ""}, "drawing-1");
  });

  it("can update the properties of a set of selected drawing objects", () => {
    const model = createDrawingContentWithMetadata();
    expect(model.currentStamp).toBeNull();

    const rectSnapshot1: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"a", x:0, y:0};
    model.addObject(rectSnapshot1);

    const rectSnapshot2: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"b", x:10, y:10};
    model.addObject(rectSnapshot2);

    logTileChange.mockReset();
    model.setSelection(["a", "b"]);
    model.setStroke("#000000", model.selectedIds);
    model.setStrokeWidth(2, model.selectedIds);
    model.setStrokeDashArray("3,3", model.selectedIds);

    expect(model.objects[0].type).toBe("rectangle");
    const rect1 = model.objects[0] as RectangleObjectType;
    // Set stroke doesn't seem to be applied to the selected objects
    expect(rect1.stroke).toBe("#000000");
    expect(rect1.strokeWidth).toBe(2);

    expect(model.objects[1].type).toBe("rectangle");
    const rect2 = model.objects[0] as RectangleObjectType;
    expect(rect2.stroke).toBe("#000000");
    expect(rect2.strokeWidth).toBe(2);

    expect(logTileChange).toHaveBeenNthCalledWith(1,
      LogEventName.DRAWING_TOOL_CHANGE, "setSelection", { args: [["a", "b"]], path: "" }, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(2,
      LogEventName.DRAWING_TOOL_CHANGE, "setStroke", { args: ["#000000", ["a", "b"]], path: "" }, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(3,
      LogEventName.DRAWING_TOOL_CHANGE, "setStrokeWidth", { args: [2, ["a", "b"]], path: "" }, "drawing-1");
    expect(logTileChange).toHaveBeenNthCalledWith(4,
      LogEventName.DRAWING_TOOL_CHANGE, "setStrokeDashArray", { args: ["3,3", ["a", "b"]], path: "" }, "drawing-1");
  });

  it("can move objects", () => {
    const model = createDrawingContentWithMetadata();

    const rectSnapshot1: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"a", x:0, y:0};
    model.addObject(rectSnapshot1);

    const rectSnapshot2: RectangleObjectSnapshotForAdd = {...baseRectangleSnapshot, id:"b", x:10, y:10};
    model.addObject(rectSnapshot2);

    logTileChange.mockReset();
    model.moveObjects([
      {id: "a", destination: {x: 20, y: 20}},
      {id: "b", destination: {x: 30, y: 30}}
    ]);
    expect(logTileChange).toHaveBeenNthCalledWith(1,
      LogEventName.DRAWING_TOOL_CHANGE, "moveObjects", { args: [[
        {id: "a", destination: {x: 20, y: 20}},
        {id: "b", destination: {x: 30, y: 30}}
      ]], path: "" }, "drawing-1");
  });

  it("can change the current stamp", () => {
    const model = createDrawingContentWithMetadata({
      stamps: [ {
          url: "a.png",
          width: 10,
          height: 10
        },
        {
          url: "b.png",
          width: 10,
          height: 10
        }
      ]
    });

    expect(model.currentStamp).toBeDefined();
    expect(model.currentStamp!.url).toBe("a.png");

    model.setSelectedStamp(1);

    expect(model.currentStamp!.url).toBe("b.png");
  });

  it("can update image urls", () => {
    const originalUrl = "my/image/url";
    const image = ImageObject.create({
      url: originalUrl, x: 0, y: 0, width: 10, height: 10
    });
    const model = createDrawingContentWithMetadata({
      objects: [image]
    });

    model.updateImageUrl("", "");
    expect(image.url).toEqual(originalUrl);

    // Updates to a empty string are ignored
    model.updateImageUrl("my/image/url", "");
    expect(image.url).toEqual(originalUrl);

    model.updateImageUrl("", "my/image/newUrl");
    expect(image.url).toEqual(originalUrl);

    model.updateImageUrl("my/image/url", "my/image/newUrl");
    expect(image.url).toBe("my/image/newUrl");
  });

  test("addObject throws when an instance is passed to it", () => {
    const model = createDrawingContentWithMetadata();
    const rect = RectangleObject.create(baseRectangleSnapshot);

    expect(() => model.addObject(rect)).toThrow();
  });
});
