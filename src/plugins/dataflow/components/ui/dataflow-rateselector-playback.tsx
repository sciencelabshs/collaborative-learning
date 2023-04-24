import React, { useEffect, useRef } from "react";
import Slider from "rc-slider";
import { ProgramDataRate } from "../../model/utilities/node";
import { DataflowContentModelType } from "../../model/dataflow-content";

import "./dataflow-rateselector-playback.scss";

const totalSamples = 10000;

/* ==[ Sampling Rate Selector ] == */
interface IRateSelectorProps {
  rateOptions: ProgramDataRate[];
  dataRate: number;
  onRateSelectClick: (rate: number) => void;
  readOnly: boolean;
  programRecordState: number;
  isPlaying: boolean; //for playback of data
  handleChangeIsPlaying: () => void;
  numNodes: number;
  onRecordDataChange: () => void;
  tileContent: DataflowContentModelType;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = minutes.toString().padStart(3, '0');
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}

export const RateSelectorOrPlayBack = (props: IRateSelectorProps) => {
  const { onRateSelectClick, readOnly, dataRate, rateOptions, programRecordState,
          isPlaying, handleChangeIsPlaying, numNodes, onRecordDataChange, tileContent } = props;

  /* ==[ Total Recording Time  - Calculate] format as "MMM:SS" */
  const totalTimeSec = Math.floor((dataRate / 1000) * (totalSamples/numNodes));
  const totalTimeFormatted = formatTime(totalTimeSec);

  /* ==[ Timer Recording Time  - Calculate] format as "MMM:SS" */
  const timerMin = useRef(0);
  const sliderSec = useRef(0); //this does not wrap around 60 and is used for the slider/total seconds
  const timerSec = useRef(0); //seconds that have passed after hitting Record
  const formattedMin = timerMin.current.toString().padStart(3, "0");
  const formattedSec = timerSec.current.toString().padStart(2, "0");
  const formattedTime = `${formattedMin}:${formattedSec}`;

  /* ==[ Playback Recording Time  - Calculate] format as "MMM:SS" */
  // seperate timer for when programRecordState is stopped (2), and Play button is hit
  const playBackTimerMin = useRef(0);
  const playBackTimerSec = useRef(0);
  const playBackFormattedMin = playBackTimerMin.current.toString().padStart(3, "0");
  const playBackFormattedSec = playBackTimerSec.current.toString().padStart(2, "0");
  const playBackFormattedTime = `${playBackFormattedMin}:${playBackFormattedSec}`;

  /* ==[ Timer - Enable ] == */
  const timerRunning = numNodes > 0 && sliderSec.current < totalTimeSec && (programRecordState === 1);
  const playBackTimerRunning = !timerRunning && isPlaying;

  const playBackIsFinished = (playBackTimerSec.current === timerSec.current) && (playBackTimerSec.current !== 0);

  //after you've hit is playing, or when you've paused (!isPlaying) and its not done yet, and you're in clear state
  const condition = (playBackTimerRunning || ((!isPlaying) && (!playBackIsFinished) && programRecordState === 2))
  || playBackIsFinished;

  /* ==[ Slider Max Value ] == */
  let sliderMaxValue = condition ? timerSec.current : totalTimeSec;

  /* ==[ Timer for Play, Timer for Playback ] == */
  useEffect(()=>{
    if (timerRunning){
      const timer = setInterval(() => {
        timerSec.current++;
        sliderSec.current++;
        if (timerSec.current === 60){
          timerMin.current++;
          timerSec.current = 0;
        }
      }, 1000);
      return () => clearInterval(timer);
    }
    if (playBackTimerRunning && !playBackIsFinished){
      const playBackTimer = setInterval(() => {
        playBackTimerSec.current++;
        sliderSec.current++;
        if (playBackTimerSec.current === 60){
          playBackTimerMin.current++;
          playBackTimerSec.current = 0;
        }
      }, 1000);
      return () => clearInterval(playBackTimer);
    }
  }, [timerSec, timerRunning, sliderSec, playBackTimerRunning, programRecordState, playBackIsFinished]);

  /* ==[ Stop Mode - Reset slider and counter to 0 ] == */
  useEffect(()=>{
    /* ==[ Timer - Reset ] == */
    if (programRecordState === 0) {
      timerSec.current = 0;
      timerMin.current = 0;
      sliderSec.current = 0;
    }
    if (programRecordState === 2){
      playBackTimerSec.current = 0;
      sliderSec.current = 0;
    }
  }, [programRecordState]);

  useEffect(()=>{
    if (playBackIsFinished && isPlaying) {
      handleChangeIsPlaying(); //go from pause to play
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playBackIsFinished, isPlaying]);

  useEffect(()=>{
    if (!isPlaying && playBackIsFinished){
      playBackTimerSec.current = 0;
      sliderSec.current = 0;
    }
  }, [isPlaying, playBackIsFinished]);

  if(sliderSec.current === totalTimeSec && programRecordState === 1){
    onRecordDataChange();
  }

  const railRef = useRef<HTMLDivElement>(null);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onRateSelectClick(Number(event.target.value));
  };
  /* ==[ For Refresh -  Store Value Into Model ] == */
  if (programRecordState === 1 ){ //write into model to keep value upon refresh
    tileContent.setFormattedTime(formattedTime);
  }
  /* ==[ For Refresh -  Reset sliderMaxValue] == */
  //TODO: figure out a more efficient way to do this
  if (tileContent.formattedTime !== "000:00" && programRecordState === 2){
    sliderMaxValue = stringToSeconds(tileContent.formattedTime) + 1;
    timerSec.current = sliderMaxValue;
  }

  return (
    <>
      <div className="topbar-sampleratetext-or-timeslider">
        {
          programRecordState ?
          <div className="slider-container">
            <Slider
              min={0}
              max={sliderMaxValue}
              step={1}
              value={sliderSec.current}
              ref={railRef}
            />
          </div>
          :
          <label className="samplerate-label" htmlFor="rate-select">Sampling Rate</label>
        }
      </div>

      <div className="topbar-datarate-or-timer">
        <div className="datarate-options">
          {
            !programRecordState ?
            <select onChange={handleSelectChange}
              disabled={readOnly}
              value={dataRate.toString()}
              id="rate-select" // TODO: The id needs to be unique to the particular DF tile
            >
              {
                rateOptions.map((rate: ProgramDataRate) => (
                <option key={rate.text} value={rate.val} disabled={rate.disabled}>
                  {rate.text}
                </option>
                ))
              }
            </select> :
            numNodes > 0 &&
            <div className="countdown-timer">
              {
                programRecordState === 1 ? `${formattedTime} / ${totalTimeFormatted}`
                : `${playBackFormattedTime}/${tileContent.formattedTime}` //store formattedTime upon refresh =
              }
            </div>
          }
        </div>
      </div>
    </>
  );
};


const stringToSeconds = (formattedTime: string) => {
    // Split the input string into minutes and seconds
    const [minutes, seconds] = formattedTime.split(':');
    // Convert the minutes and seconds to numbers
    const numMinutes = parseInt(minutes, 10);
    const numSeconds = parseInt(seconds, 10);
    // Convert the minutes to seconds and add to the seconds
    const totalSeconds = (numMinutes * 60) + numSeconds;
    // Return the total number of seconds
    return totalSeconds;
};
