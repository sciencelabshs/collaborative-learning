// FIXME: ESLint is unhappy with these control components
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useRef }  from "react";
import Rete, { NodeEditor, Node } from "rete";
import { NodeChannelInfo, kRelaySelectMessage,
  kRelayMissingMessage } from "../../model/utilities/node";
import { useStopEventPropagation, useCloseDropdownOnOutsideEvent } from "./custom-hooks";
import DropdownCaretIcon from "../../assets/icons/dropdown-caret.svg";
import "./sensor-select-control.sass";

export class RelaySelectControl extends Rete.Control {
  private emitter: NodeEditor;
  private component: any;
  private props: any;
  private node: Node;

  constructor(emitter: NodeEditor, key: string, node: Node, readonly = false) {
    super(key);
    this.emitter = emitter;
    this.key = key;
    this.node = node;

    const handleChange = (onChange: any) => {
      return (e: any) => { onChange(e.target.value); };
    };

    this.component = (compProps: {
        value: string;
        showList: boolean;
        channels: NodeChannelInfo[]
        onRelayDropdownClick: () => void;
        onRelayOptionClick: () => void; }) => (
      <div>
        { renderRelayList(
            compProps.value,
            compProps.showList,
            compProps.channels,
            compProps.onRelayDropdownClick,
            compProps.onRelayOptionClick) }
      </div>
    );

    const renderRelayList = (
        id: string,
        showList: boolean,
        channels: NodeChannelInfo[],
        onDropdownClick: any,
        onListOptionClick: any) => {
      const divRef = useRef<HTMLDivElement>(null);
      useStopEventPropagation(divRef, "pointerdown");
      useStopEventPropagation(divRef, "wheel");
      const listRef = useRef<HTMLDivElement>(null);
      useCloseDropdownOnOutsideEvent(listRef, () => this.props.showList, () => {
                                      this.props.showList = false;
                                      (this as any).update();
                                    });

      const channelsForType = channels.filter((ch: NodeChannelInfo) => (ch.type === "relay"));
      const selectedChannel = channelsForType.find((ch: any) => ch.channelId === id);

      const getChannelString = (ch?: NodeChannelInfo | "none") => {
        if (!ch && (!id || id === "none")) return kRelaySelectMessage;
        if (ch === "none") return "None Available";
        if (!ch) return `${kRelayMissingMessage} ${id}`;
        if (ch.missing) return `${kRelayMissingMessage} ${ch.channelId}`;
        let count = 0;
        channelsForType.forEach( c => { if (c.type === ch.type && ch.hubId === c.hubId) count++; } );
        return `${ch.hubName}:${ch.type}${ch.plug > 0 && count > 1 ? `(plug ${ch.plug})` : ""}`;
      };
      const options: any = [...channelsForType];
      if (!options.length) {
        options.push("none");
      }
      const channelString = getChannelString(selectedChannel);
      const titleClass = channelString.includes(kRelaySelectMessage)
                         ? "label unselected"
                         : "label";
      const topItemClass = channelString.includes(kRelayMissingMessage)
                         ? "item top missing"
                         : "item top";
      return (
        <div className="node-select relay-select" ref={divRef} title={"Select Relay"}>
          <div className={topItemClass} onMouseDown={handleChange(onDropdownClick)}>
            <div className={titleClass}>{channelString}</div>
            <svg className="icon dropdown-caret">
              <DropdownCaretIcon />
            </svg>
          </div>
          {showList ?
          <div className="option-list" ref={listRef}>
            {options.map((ch: NodeChannelInfo, i: any) => (
              <div
                className={
                  (!!id && !!ch && ch.channelId === id) || (!selectedChannel && i === 0)
                    ? ("item relay-type-option selected " + (ch.missing ? "missing" : ""))
                    : ("item relay-type-option selectable " + (ch.missing ? "missing" : ""))
                }
                key={i}
                onMouseDown={onListOptionClick(ch ? ch.channelId : null)}
              >
                <div className="label">
                  {getChannelString(ch)}
                </div>
              </div>
            ))}
          </div>
          : null }
        </div>
      );
    };

    const initial = node.data[key] || "none";
    node.data[key] = initial;

    this.props = {
      readonly,
      value: initial,
      showList: false,
      onRelayDropdownClick: () => {
        this.emitter.trigger("selectnode", { node: this.getNode() });
        this.props.showList = !this.props.showList;
        (this as any).update();
      },
      onRelayOptionClick: (v: any) => () => {
        this.emitter.trigger("selectnode", { node: this.getNode() });
        this.props.showList = false;
        (this as any).update();
        this.setValue(v);
        this.emitter.trigger("process");
      },
      channels: []
    };
  }

  public setChannels = (channels: NodeChannelInfo[]) => {
    this.props.channels = channels;
    // problem, if called with event nodecreate, update doesn't exist
    // (this as any).update();
  };

  public setValue = (val: any) => {
    this.props.value = val;
    this.putData(this.key, val);
    (this as any).update();
  };

  public getValue = () => {
    return this.props.value;
  };
}
/* eslint-enable */
