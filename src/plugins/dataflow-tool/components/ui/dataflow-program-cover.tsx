import React from "react";

import "./dataflow-program-cover.scss";

interface CoverProps {
  editorClass: string;
  isRunning: boolean;
}

export const DataflowProgramCover = (props: CoverProps) => {
  const coverClass = `cover ${props.editorClass} ${(props.isRunning ? "running" : "")}`;
  return (
    <div className={coverClass}/>
  );
};