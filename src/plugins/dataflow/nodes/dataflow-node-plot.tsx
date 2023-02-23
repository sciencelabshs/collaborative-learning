import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { ChartOptions, ChartData, ChartDataSets } from "chart.js";
import { MAX_NODE_VALUES } from "../components/dataflow-program";
import { NodePlotColor } from "../model/utilities/node";
import "./dataflow-node.scss";

interface INodePlotProps {
  display: boolean;
  data: any;
}

export interface MinigraphOptions {
  backgroundColor?: string;
  borderColor?: string;
}

enum Zoom {
  In,
  Out
}

export const defaultMinigraphOptions: MinigraphOptions = {
  backgroundColor: NodePlotColor,
  borderColor: NodePlotColor
};

let stepY = 5;

export const DataflowNodePlot: React.FC<INodePlotProps> = (props) => {
  // const [offset, setOffset] = useState(0);
  if (!props.display) return null;

  const handleClickOffset = (zoomDir: Zoom) => {
    // console.log("-------CLICK START----------");
    // console.log("handleClickOffset > props.dta.data.tickMax:", props.data.data.tickMax);
    // console.log("handleClickOffset > props.dta.data.dsMax:", props.data.data.dsMax);
    const max = props.data.data.tickMax || props.data.data.dsMax;
    // console.log("handleClickOffset > max:", max);
    const min = props.data.data.tickMin || props.data.data.dsMin;
    // console.log("handleClickOffset > min:", min);
    const difference = Math.abs(max - min);
    console.log("handleClickOffset > difference:", difference);
    const offset = 0.1 * difference;

    if (zoomDir === Zoom.In ){
      console.log("zoomIn > offset in tickMax", offset);

      props.data.data.tickMax = props.data.data.tickMax ?
                                props.data.data.tickMax - offset :
                                props.data.data.dsMax - offset;

      console.log("zoomIn > offset in tickMin", offset);

      props.data.data.tickMin = props.data.data.tickMin ?
                                props.data.data.tickMin + offset :
                                props.data.data.dsMin + offset;
    }
    if (zoomDir === Zoom.Out){
      props.data.data.tickMax = props.data.data.tickMax ?
                                props.data.data.tickMax + offset :
                                props.data.data.dsMax + offset;
      props.data.data.tickMin = props.data.data.tickMin ?
                                props.data.data.tickMin - offset :
                                props.data.data.dsMin - offset;
    }
  };

  const scaleBtnColorClass= props.data.name.charAt(0).toLowerCase() + props.data.name.slice(1);



  return (
    <div className="node-bottom-section">
      <div className="node-bottom-buttons">
        <button
          className={`scale-buttons ${scaleBtnColorClass} plus`} onClick={() => handleClickOffset(Zoom.In)}>
          +
        </button>
        <button
          className={`scale-buttons ${scaleBtnColorClass} minus`} onClick={() => handleClickOffset(Zoom.Out)}>
          -
        </button>
      </div>
      <div className="node-graph">
        {/* {console.log("------render start----------")} */}
        {/* {console.log("props:", props)} */}

        <Line
          data={lineData(props.data)}
          options={lineOptions(props.data)}
          redraw={true}
        />
        {/* {console.log("------render end----------")} */}

      </div>
    </div>
  );
};


function lineData(node: any) {
  const chartDataSets: ChartDataSets[] = [];
  Object.keys(node.data.watchedValues).forEach((valueKey: string) => {
    const recentValues: any = node.data.recentValues?.[valueKey];
    if (recentValues !== undefined) {
      const customOptions = node.data.watchedValues?.[valueKey] || {};
      const dataset: ChartDataSets = {
        backgroundColor: NodePlotColor,
        borderColor: NodePlotColor,
        borderWidth: 2,
        pointRadius: 2,
        data: [0],
        fill: false,
        ...customOptions
      };

      const chData: any[] = [];
      recentValues.forEach((val: any) => {
        if (isFinite(val)) {
          chData.push(val);
        }
      });
      const localMax = Math.max(...chData);
      node.data.dsMax = ((node.data.dsMax !== undefined) ? Math.max(localMax, node.data.dsMax) : localMax);
      const localMin = Math.min(...chData);
      node.data.dsMin = ((node.data.dsMin !== undefined) ? Math.min(localMin, node.data.dsMin) : localMin);
      dataset.data = chData;
      chartDataSets.push(dataset);
    }
  });

  stepY = (node.data.dsMax  - node.data.dsMin) / 2;
  if (node.name === "Sensor"){
    console.log("Sensor stepY:", stepY);
    console.log("node.data.dsMin: ", node.data.dsMin);
  }

  const chartData: ChartData = {
    labels: new Array(MAX_NODE_VALUES).fill(undefined).map((val,idx) => idx),
    datasets: chartDataSets
  };
  return chartData;
}


function lineOptions(node: any) {
  const max = node.data.tickMax || node.data.dsMax;
  const min = node.data.tickMin || node.data.dsMin;

  const options: ChartOptions = {
    animation: {
      duration: 0
    },
    legend: {
      display: false,
      position: "bottom",
    },
    maintainAspectRatio: true,
    scales: {
      yAxes: [{
        id: "y-axis-0",
        type: "linear",
        ticks: {
          fontSize: 9,
          display: true,
          stepSize: stepY,
          max: (max === min) ? max + 1 : max,
          min: (max === min) ? min - 1 : min,
          maxTicksLimit: 3,
          minRotation: 0,
          maxRotation: 0,
        },
        gridLines: {
          display: false,
        }
      }],
      xAxes: [{
        id: "x-axis-0",
        ticks: {
          display: false,
        },
        gridLines: {
          display: false
        }
      }]
    },
  };

  if (options.scales?.yAxes){
    const obj = options.scales?.yAxes[0];
    if (obj.ticks){
      // console.log("in lineOptions > max:", obj.ticks.max);
      // console.log("in lineOptions > min:", obj.ticks.min);

    }
  }



  return options;
}
