import {useDroppable} from '@dnd-kit/core';
import {observer} from "mobx-react-lite";
import React, {useEffect, useMemo, useRef} from "react";
import {useResizeDetector} from "react-resize-detector";
import {useDataSet} from '../hooks/use-data-set';
import {DataSetContext} from '../hooks/use-data-set-context';
import {useGraphController} from "../hooks/use-graph-controller";
import {useInitGraphLayout} from '../hooks/use-init-graph-layout';
import {InstanceIdContext, useNextInstanceId} from "../hooks/use-instance-id-context";
import {AxisLayoutContext} from "../axis/models/axis-layout-context";
import {GraphController} from "../models/graph-controller";
import {GraphLayoutContext} from "../models/graph-layout";
import {GraphModelContext, isGraphModel} from "../models/graph-model";
import {Graph} from "./graph";
import {DotsElt} from '../d3-types';
import { ITileModel } from 'src/models/tiles/tile-model';

interface IProps {
  tile?: ITileModel;
}

export const GraphComponent = observer(function GraphComponent({tile}: IProps) {
  const graphModel = isGraphModel(tile?.content) ? tile?.content : undefined;

  const instanceId = useNextInstanceId("graph");
  const { data } = useDataSet(graphModel?.data);
  const layout = useInitGraphLayout(graphModel);
  // Removed deboucing, but we can bring it back if we find we need it
  const {width, height, ref: graphRef} = useResizeDetector(/*{refreshMode: "debounce", refreshRate: 15}*/);
  const enableAnimation = useRef(true);
  const autoAdjustAxes = useRef(true);
  const dotsRef = useRef<DotsElt>(null);
  const graphController = useMemo(
    () => new GraphController({layout, enableAnimation, instanceId, autoAdjustAxes}),
    [layout, instanceId]
  );

  useGraphController({graphController, graphModel, dotsRef});

  useEffect(() => {
    (width != null) && (height != null) && layout.setParentExtent(width, height);
  }, [width, height, layout]);

  // used to determine when a dragged attribute is over the graph component
  const dropId = `${instanceId}-component-drop-overlay`;
  const {setNodeRef} = useDroppable({id: dropId});
  setNodeRef(graphRef.current);

  if (!graphModel) return null;

  return (
    <DataSetContext.Provider value={data}>
      <InstanceIdContext.Provider value={instanceId}>
        <GraphLayoutContext.Provider value={layout}>
          <AxisLayoutContext.Provider value={layout}>
            <GraphModelContext.Provider value={graphModel}>
              <Graph graphController={graphController}
                      graphRef={graphRef}
                      dotsRef={dotsRef}
              />
            </GraphModelContext.Provider>
          </AxisLayoutContext.Provider>
        </GraphLayoutContext.Provider>
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  );
});
