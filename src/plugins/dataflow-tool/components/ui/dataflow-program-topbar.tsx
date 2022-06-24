import React from "react";
import { ProgramDataRate } from "../../model/utilities/node";
import { IconButton } from "../../../../components/utilities/icon-button";

import "./dataflow-program-topbar.scss";

interface TopbarProps {
  onRunProgramClick: () => void;
  onStopProgramClick: () => void;
  programDataRates: ProgramDataRate[];
  dataRate: number;
  onRateSelectClick: (rate: number) => void;
  onRefreshDevices: () => void;
  isRunEnabled: boolean;
  runningProgram: boolean;
  remainingTimeInSeconds: number;
  readOnly: boolean;
  showRateUI: boolean;
  lastIntervalDuration: number;
}

// const kProgressWidth = 76;

// interface CountdownTimerProps {
//   duration: string;
//   width: number;
//   hours: string;
//   minutes: string;
//   seconds: string;
// }
// const CountdownTimerComponent: React.SFC<CountdownTimerProps> = (props: CountdownTimerProps) => {
//   return (
//     <div className="running-container countdown">
//       <div className="total">
//         {`Duration: ${props.duration}`}
//       </div>
//       <div className="remaining">
//         <div className="progress-bar" style={{width: props.width.toString() + "px"}}/>
//         <div className="progress-time">
//         {`${props.hours}:${props.minutes}:${props.seconds}`}
//         </div>
//       </div>
//     </div>
//   );
// };

interface RateSelectorProps {
  rateOptions: ProgramDataRate[];
  dataRate: number;
  onRateSelectClick: (rate: number) => void;
  readOnly: boolean;
}

const RateSelectorComponent = (props: RateSelectorProps) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.onRateSelectClick(Number(event.target.value));
  };
  return (
    <div className="running-container">
      <div className="datarate" title="Set Program Data Rate">
        <div className="label-back">
          <label className="label" htmlFor="rate-select">Data Rate</label>
        </div>
        <div className="datarate-options-back">
          <div className="datarate-options">
            <select onChange={handleSelectChange}
              disabled={props.readOnly}
              value={props.dataRate.toString()}
              id="rate-select" // TODO: The id needs to be unique to the particular DF tile
            >
              { props.rateOptions.map((rate: ProgramDataRate) => (
                <option key={rate.text} value={rate.val} disabled={rate.disabled}>
                  {rate.text}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RecordButtonProps {
  readOnly: boolean;
}

const RecordButton = (props: RecordButtonProps) => {
  return (
    <button
      className="program-state-button"
      title="Record"
      onClick={() => null }
      disabled={props.readOnly}
    >
      <div className="icon run" />
      <div className="text">Record</div>
    </button>
  );
};

export const DataflowProgramTopbar = (props: TopbarProps) => {
  return (
    <div className="program-editor-topbar">
      <div className="topbar-left"></div>
      <div className="topbar-center">
        <RateSelectorComponent
          rateOptions={props.programDataRates}
          dataRate={props.dataRate}
          onRateSelectClick={props.onRateSelectClick}
          readOnly={props.readOnly}
        />
        <RecordButton readOnly={props.readOnly} />
        <button
          className="program-state-button"
          title="Stop Program"
          onClick={props.onStopProgramClick}
          disabled={!props.runningProgram || !props.readOnly}
        >
          <div className="icon stop" />
          <div className="text">Stop</div>
        </button>
      </div>
      <div className="topbar-right">
        {props.showRateUI && <span className={"rate-ui"}>{`${props.lastIntervalDuration}ms`}</span>}
        <IconButton icon="refresh" key="refresh" className={"icon-refresh"}
          onClickButton={props.onRefreshDevices} title="Refresh Devices" disabled={props.readOnly} />
      </div>
    </div>
  );

};