import { JXGChange, JXGChangeAgent, JXGProperties } from "./jxg-changes";
import "./jxg";
import { goodTickValue } from "../../../utilities/graph-utils";
import { assign, find, values } from "lodash";

const kScalerClasses = ["canvas-scaler", "scaled-list-item"];

const toObj = (p: string, v: any) => v ? { [p]: v } : undefined;

export const kGeometryDefaultWidth = 480;
export const kGeometryDefaultHeight = 320;
export const kGeometryDefaultPixelsPerUnit = 18.3;  // matches S&S curriculum images
export const kGeometryDefaultAxisMin = 0;
export const kAxisBuffer = 20;
export const isBoard = (v: any) => v instanceof JXG.Board;
export const isAxis = (v: any) => (v instanceof JXG.Line) && (v.elType === "axis");
export const isAxisLabel = (v: any) => v instanceof JXG.Text && !!values(v.ancestors).find(el => isAxis(el));
export const getAxisType = (v: any) => {
  // stdform encodes orientation of axes
  const [ , stdFormY, stdFormX] = v.stdform;
  if (stdFormX) return "x";
  if (stdFormY) return "y";
};
export function getAxis(board: JXG.Board, type: "x" | "y") {
  return find(board.objectsList, obj => isAxis(obj) && (getAxisType(obj) === type));
}

export function getBaseAxisLabels(board: JXG.Board) {
  return ["x", "y"].map(xy => {
    const axis = getAxis(board, xy as "x" | "y");
    return axis?.getAttribute("clientName") as string | undefined || xy;
  });
}

export function syncAxisLabels(board: JXG.Board, xAxisLabel: string, yAxisLabel: string) {
  const xAxis = getAxis(board, "x");
  const yAxis = getAxis(board, "y");
  if (xAxis) xAxis.name = xAxisLabel;
  if (yAxis) yAxis.name = yAxisLabel;
  if (xAxis || yAxis) board.update();
}

export function getTickValues(pixPerUnit: number) {
  // we use the range over a prototypical size (e.g. 480px) to determine tick values
  const protoRange = kGeometryDefaultWidth / pixPerUnit;
  const [majorTickDistance, minorTicks] = goodTickValue(protoRange);
  const minorTickDistance = majorTickDistance / (minorTicks + 1);
  return [majorTickDistance, minorTicks, minorTickDistance];
}

function findNearestMinorTicks(board: JXG.Board, x: number, y: number) {
  const [ , , xMinorTickDistance] = getTickValues(board.unitX);
  const [ , , yMinorTickDistance] = getTickValues(board.unitY);
  const xOut = xMinorTickDistance * Math.round(x / xMinorTickDistance);
  const yOut = yMinorTickDistance * Math.round(y / yMinorTickDistance);
  return [xOut, yOut];
}

export const kReverse = true;
export function sortByCreation(board: JXG.Board, ids: string[], reverse: boolean = false) {
  const indices: { [id: string]: number } = {};
  board.objectsList.forEach((obj, index) => {
    indices[obj.id] = index;
  });
  ids.sort(reverse
            ? (a, b) => indices[b] - indices[a]
            : (a, b) => indices[a] - indices[b]);
}

function combineProperties(domElementID: string, defaults: any, changeProps: any, overrides: any) {
  const { id, ...otherProps } = changeProps;
  otherProps.boundingBox = scaleBoundingBoxToElement(domElementID, changeProps);
  return assign(defaults, otherProps, overrides);
}

function getCanvasScale(eltOrId: string | HTMLElement | null) {
  let elt = typeof eltOrId === "string"
              ? document.getElementById(eltOrId)
              : eltOrId;
  for ( ; elt != null; elt = elt.parentElement) {
    if (kScalerClasses.some(_class => elt?.classList.contains(_class))) {
      const transform = getComputedStyle(elt).transform;
      const match = transform && /(scale|matrix)\((.+)\)/.exec(transform);
      return match && match[2] ? parseFloat(match[2]) : 1;
    }
  }
  return 1;
}

function scaleBoundingBoxToElement(domElementID: string, changeProps: any) {
  const elt = document.getElementById(domElementID);
  const eltBounds = elt?.getBoundingClientRect();
  const eltWidth = eltBounds?.width || kGeometryDefaultWidth;
  const eltHeight = eltBounds?.height || kGeometryDefaultHeight;
  const { boundingBox } = changeProps;
  const [unitX, unitY] = getAxisUnitsFromProps(changeProps, getCanvasScale(elt));
  const [xMin, , , yMin] = boundingBox || [kGeometryDefaultAxisMin, , , kGeometryDefaultAxisMin];
  const xMax = xMin + eltWidth / unitX;
  const yMax = yMin + eltHeight / unitY;
  return [xMin, yMax, xMax, yMin] as JXG.BoundingBox;
}

export function guessUserDesiredBoundingBox(board: JXG.Board) {
  const [xMin, yMax, xMax, yMin] = board.getBoundingBox();
  const unitX = board.unitX;
  const unitY = board.unitY;
  const xBufferRange = kAxisBuffer / unitX;
  const yBufferRange = kAxisBuffer / unitY;

  return [xMin + xBufferRange, yMax - yBufferRange, xMax - xBufferRange, yMin + yBufferRange];
}

function getAxisLabelsFromProps(props: JXGProperties) {
  const xName = props?.xName || props?.boardScale?.xName;
  const yName = props?.yName || props?.boardScale?.yName;
  return [xName, yName];
}

function getAxisUnitsFromProps(changeProps?: JXGProperties, scale = 1) {
  const unitX = changeProps?.unitX || changeProps?.boardScale?.unitX || kGeometryDefaultPixelsPerUnit;
  const unitY = changeProps?.unitY || changeProps?.boardScale?.unitY || kGeometryDefaultPixelsPerUnit;
  return [unitX * scale, unitY * scale];
}

function createBoard(domElementId: string, properties?: JXGProperties) {
  const defaults = {
          keepaspectratio: true,
          showCopyright: false,
          showNavigation: false,
          minimizeReflow: "none"
        };
  const changeProps = properties && properties as JXGProperties;
  const [unitX, unitY] = getAxisUnitsFromProps(changeProps);
  // cf. https://www.intmath.com/cg3/jsxgraph-axes-ticks-grids.php
  const overrides = { axis: false, keepaspectratio: unitX === unitY };
  const props = combineProperties(domElementId, defaults, changeProps, overrides);
  const board = JXG.JSXGraph.initBoard(domElementId, props);
  return board;
}

interface IAddAxesParams {
  xName?: string;
  yName?: string;
  unitX: number;
  unitY: number;
  boundingBox?: JXG.BoundingBox;
}

function addAxes(board: JXG.Board, params: IAddAxesParams) {
  const { xName, yName, unitX, unitY, boundingBox } = params;
  const [xMajorTickDistance, xMinorTicks, xMinorTickDistance] = getTickValues(unitX);
  const [yMajorTickDistance, yMinorTicks, yMinorTickDistance] = getTickValues(unitY);
  board.removeGrids();
  board.options.grid = { ...board.options.grid, gridX: xMinorTickDistance, gridY: yMinorTickDistance };
  board.addGrid();
  if (boundingBox && boundingBox.every((val: number) => isFinite(val))) {
    board.setBoundingBox(boundingBox);
  }
  const xAxis = board.create("axis", [ [0, 0], [1, 0] ], {
    name: xName || "x",
    withLabel: true,
    label: {fontSize: 13, anchorX: "right", position: "rt", offset: [0, 15]},
    ...toObj("clientName", xName)
  });
  xAxis.removeAllTicks();
  board.create("ticks", [xAxis, xMajorTickDistance], {
    strokeColor: "#bbb",
    majorHeight: -1,
    drawLabels: true,
    label: { anchorX: "middle", offset: [-8, -10] },
    minorTicks: xMinorTicks,
    drawZero: true
  });
  const yAxis = board.create("axis", [ [0, 0], [0, 1] ], {
    name: yName || "y",
    withLabel: true,
    label: {fontSize: 13, position: "rt", offset: [15, 0]},
    ...toObj("clientName", yName)
  });
  yAxis.removeAllTicks();
  board.create("ticks", [yAxis, yMajorTickDistance], {
    strokeColor: "#bbb",
    majorHeight: -1,
    drawLabels: true,
    label: { anchorX: "right", offset: [-4, -1] },
    minorTicks: yMinorTicks,
    drawZero: false
  });
  return [xAxis, yAxis];
}

export const boardChangeAgent: JXGChangeAgent = {
  create: (boardDomId: JXG.Board|string, change: JXGChange) => {
    const props = change.properties;
    const board = isBoard(boardDomId)
                    ? boardDomId as JXG.Board
                    : createBoard(boardDomId as string, props);
    // If we created the board from a DOM element ID, then we need to add the axes.
    // If we are undoing an action, then the board already exists but its axes have
    // been removed, so we have to add the axes in that case as well.
    const boundingBox = scaleBoundingBoxToElement(board.containerObj.id, props);
    const scale = getCanvasScale(board ? board.container : boardDomId as string);
    const [xName, yName] = getAxisLabelsFromProps(props as JXGProperties);
    const [unitX, unitY] = getAxisUnitsFromProps(props, scale);
    const axes = addAxes(board, {
                          unitX, unitY, boundingBox,
                          ...toObj("xName", xName), ...toObj("yName", yName)
                        });
    return [board, ...axes];
},

  update: (board: JXG.Board, change: JXGChange) => {
    if (!change.properties) { return; }
    const props = change.properties as JXGProperties;
    if (board) {
      const boardScale = props.boardScale;
      if (boardScale) {
        const { canvasWidth, canvasHeight } = boardScale;
        const [xName, yName] = getAxisLabelsFromProps(change.properties);
        const width = board.canvasWidth;
        const height = board.canvasHeight;
        const widthMultiplier = (width - kAxisBuffer * 2) / canvasWidth;
        const heightMultiplier = (height - kAxisBuffer * 2) / canvasHeight;
        const unitX = boardScale.unitX as number;
        const unitY = boardScale.unitY as number;
        const xBuffer = kAxisBuffer / unitX;
        const yBuffer = kAxisBuffer / unitY;
        // The change might have been performed on a different-sized tile due to a 2-up switch or reload
        // In that case, we need to scale the min/max to preserve user-intended ratios
        const xMin = (boardScale.xMin * widthMultiplier) - xBuffer;
        const yMin = (boardScale.yMin * heightMultiplier) - yBuffer;
        if (isFinite(xMin) && isFinite(yMin) && isFinite(unitX) && isFinite(unitY)) {
          const xRange = width / unitX;
          const yRange = height / unitY;
          const bbox: JXG.BoundingBox = [xMin, yMin + yRange, xMin + xRange, yMin];
          board.setBoundingBox(bbox);
          board.objectsList.forEach(el => {
            if (el.elType === "axis") {
              board.removeObject(el);
            }
          });
          const axes = addAxes(board, { unitX, unitY, ...toObj("xName", xName), ...toObj("yName", yName) });
          board.update();
          return axes;
        }
      }
    }
  },

  delete: (board: JXG.Board, change: JXGChange) => {
    JXG.JSXGraph.freeBoard(board);
  }
};
