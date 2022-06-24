import React from "react";
import { NodeTypes } from "../../model/utilities/node";

import "./dataflow-program-toolbar.sass";

interface IProps {
  onNodeCreateClick: (type: string) => void;
  onClearClick: () => void;
  onResetClick: () => void;
  isTesting: boolean;
  isDataStorageDisabled: boolean;
  disabled: boolean;
}

export class DataflowProgramToolbar extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const { isTesting } = this.props;
    return (
      <div className="program-toolbar" data-test="program-toolbar">
        { NodeTypes.map((nt: any, i: any) => (
            this.renderAddNodeButton(nt.name, i)
          ))
        }
        { isTesting && <button className={"qa"} onClick={this.props.onClearClick}>Clear</button> }
        { isTesting && <button className={"qa"} onClick={this.props.onResetClick}>Reset</button> }
      </div>
    );
  }

  public renderAddNodeButton(nodeType: string, i: number) {
    const handleAddNodeButtonClick = () => { this.props.onNodeCreateClick(nodeType); };
    const iconClass = "icon-block " + nodeType.toLowerCase().replace(" ", "-");
    const nodeIcons = [];
    switch (nodeType) {
      case "Number":
      case "Sensor":
      case "Generator":
      case "Timer":
        nodeIcons.push(<div className="icon-node right mid" key={"icon-node-r-m" + i}/>);
        break;
      case "Math":
      case "Logic":
        nodeIcons.push(<div className="icon-node left top" key={"icon-node-l-t" + i}/>);
        nodeIcons.push(<div className="icon-node right mid" key={"icon-node-r-m" + i}/>);
        nodeIcons.push(<div className="icon-node left bottom" key={"icon-node-l-b" + i}/>);
        break;
      case "Transform":
        nodeIcons.push(<div className="icon-node left mid" key={"icon-node-l-m" + i}/>);
        nodeIcons.push(<div className="icon-node right mid" key={"icon-node-r-m" + i}/>);
        break;
      case "Relay":
      case "Light Bulb":
      case "Data Storage":
        nodeIcons.push(<div className="icon-node left mid" key={"icon-node-l-m" + i}/>);
        break;
    }
    return (
      <button
        disabled={nodeType === "Data Storage" && this.props.isDataStorageDisabled || this.props.disabled}
        key={i} title={`Add ${nodeType} Block`}
        onClick={handleAddNodeButtonClick}
      >
        <div className={iconClass}>{nodeIcons}</div>
        <div className="label">{nodeType}</div>
      </button>
    );
  }

}