import React from "react";

interface IconButtonProps {
  icon: string;
  title?: string;
  key: string;
  className: string;
  innerClassName?: string;
  onClickButton?: () => void;
  enabled?: boolean;
  url?: string;
  dataTestName?: string;
  disabled?: boolean;
}

export const IconButton = (props: IconButtonProps) => {
  const styleIcon = {
    backgroundImage: `url(${props.url})`
  };
  return (
    <button
      title={props.title}
      id={`icon-${props.icon}`}
      className={`icon-button ${props.className}`}
      onClick={props.onClickButton}
      data-test={props.dataTestName || `${props.icon}-icon`}
      disabled={props.disabled}
    >
      <div
        className={`button-icon ${props.icon} ${props.innerClassName || ""}`}
        style={props.url ? styleIcon : undefined}
      />
    </button>
  );
};
