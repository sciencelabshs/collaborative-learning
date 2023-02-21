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

export const defaultMinigraphOptions: MinigraphOptions = {
  backgroundColor: NodePlotColor,
  borderColor: NodePlotColor
};

let stepY = 5;

export const DataflowNodePlot: React.FC<INodePlotProps> = (props) => {
  console.log("<DataflowNodePlot> with props", props);
  const [scalar, setScalar] = useState(1);
  if (!props.display) return null;

  const handleClickScalar = (newScalar: number) => {
    setScalar((oldVal) => oldVal * newScalar);
  };
  const scaleBtnColorClass= props.data.name.charAt(0).toLowerCase() + props.data.name.slice(1);



  return (
    <div className="node-bottom-section">
      <div className="node-bottom-buttons">
        <button
          className={`scale-buttons ${scaleBtnColorClass} plus`} onClick={() => handleClickScalar(1.25)}>
          +
        </button>
        <button
          className={`scale-buttons ${scaleBtnColorClass} minus`} onClick={() => handleClickScalar(0.8)}>
          -
        </button>
      </div>
      <div className="node-graph">
        <Line
          data={lineData(props.data)}
          options={lineOptions(props.data, scalar)}
          redraw={true}
        />
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
      node.data.dsMax = ((node.data.dsMax) ? Math.max(localMax, node.data.dsMax) : localMax);
      const localMin = Math.min(...chData);
      node.data.dsMin = ((node.data.dsMin) ? Math.min(localMin, node.data.dsMin) : localMin);
      console.log("max:", node.data.dsMax);
      console.log("min:", node.data.dsMin);
      dataset.data = chData;
      chartDataSets.push(dataset);
    }
  });

  stepY = (node.data.dsMax - node.data.dsMin) / 2;

  const chartData: ChartData = {
    labels: new Array(MAX_NODE_VALUES).fill(undefined).map((val,idx) => idx),
    datasets: chartDataSets
  };

  return chartData;
}


function lineOptions(node: any, scalar: number) {
  console.log("--------------------");
  console.log("lineOptions invoked with scalar:", scalar);
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
          stepSize: stepY * scalar,
          max: node.data.dsMax * scalar,
          min: node.data.dsMin * scalar,
          maxTicksLimit: 3,
          minRotation: 0,
          maxRotation: 0,
        },
        gridLines: {
          display: false
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

  // if (options.scales?.yAxes[0]) {
  //   console.log("maxY:", options.scales?.yAxes[0])
  // }
  console.log("lineOptions returns:", options);
  console.log("--------------------");
  return options;
}
