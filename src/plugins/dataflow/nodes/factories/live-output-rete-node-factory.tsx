import Rete, { Node, Socket } from "rete";
import { NodeData } from "rete/types/core/data";
import { DataflowReteNodeFactory } from "./dataflow-rete-node-factory";
import { InputValueControl } from "../controls/input-value-control";
import { DropdownListControl } from "../controls/dropdown-list-control";
import { NodeLiveOutputTypes, NodeMicroBitHubs,
  kRelayMappings, kBinaryOutputTypes, kRelayOutputTypes, kRoundedOutputTypes } from "../../model/utilities/node";
import { dataflowLogEvent } from "../../dataflow-logger";
import { NodeChannelInfo } from "../../model/utilities/channel";

interface HubStatus {
  id: string,
  missing: boolean
}

export class LiveOutputReteNodeFactory extends DataflowReteNodeFactory {
  constructor(numSocket: Socket) {
    super("Live Output", numSocket);
  }

  public builder(node: Node) {
    super.defaultBuilder(node);
    if (this.editor) {
      this.addInput(node, "nodeValue");
      node
        .addControl(new DropdownListControl(this.editor, "liveOutputType", node, NodeLiveOutputTypes, true))
        .addControl(new DropdownListControl(this.editor, "hubSelect", node, NodeMicroBitHubs, true));

      node.data.lastTick = Date.now();
      return node as any;
    }
  }

  public worker(node: NodeData, inputs: any, outputs: any) {
    // This node type is a "live" output and does not output a value into a rete outputs
    // This worker updates the value of the node
    // Then the default NodeProcess takes the data and sends it out via Serial.
    const n1 = inputs.nodeValue.length ? inputs.nodeValue[0] : node.data.nodeValue;
    if (this.editor) {
      const _node = this.editor.nodes.find((n: { id: any; }) => n.id === node.id);
      if (_node) {
        this.updateHubsStatusReport(_node);

        // handle data and display of data
        const outputTypeControl = _node.controls.get("liveOutputType") as DropdownListControl;
        const outputType = outputTypeControl.getValue();
        const nodeValue = _node.inputs.get("nodeValue")?.control as InputValueControl;
        let newValue = isNaN(n1) ? 0 : n1;

        // Output types have varying display requirements
        if (kBinaryOutputTypes.includes(outputType)){
          newValue = isNaN(n1) ? 0 : +(n1 !== 0);
          const offOnString = newValue === 0 ? "off" : "on";
          if (!kRelayOutputTypes.includes(outputType)) {
            nodeValue?.setDisplayMessage(offOnString);
          }
          // handle relay outputs, which are binarty but must also display if the relay state has been received
          else {
            nodeValue?.setDisplayMessage(offOnString + " " + this.getRelayMessageReceived(_node));
          }
        }

        if (kRoundedOutputTypes.includes(outputType)){
          newValue = this.getNewValueForGrabber(n1);
          const roundedDisplayValue = Math.round((newValue / 10) * 10);
          nodeValue?.setDisplayMessage(`${roundedDisplayValue}% closed`);
        }

        nodeValue?.setValue(newValue);
        nodeValue?.setConnected(inputs.nodeValue.length);

        _node.data.outputType = outputType;
        this.editor.view.updateConnections( {node: _node} );
        _node.update();
      }
    }
  }

  private getNewValueForGrabber(num: number){
    if (num > 1)  return 100;
    if (num < 0)  return 0;
    return parseInt((num * 100).toFixed(2), 10);
  }

  private getHubChannelsForNode(node: Node){
    const hubSelect = node.controls.get("hubSelect") as DropdownListControl;
    const selectedHubIdentifier = hubSelect.getValue().slice(-1); // "micro:bit hub a" => "a"
    const hubSelectChannels = hubSelect.getChannels();
    if (!hubSelectChannels) return [];
    return hubSelectChannels.filter((c: NodeChannelInfo) => c.channelId.charAt(2) === selectedHubIdentifier);
  }

  private getSelectedRelayIndex(node: Node){
    const outputTypeControl = node.controls.get("liveOutputType") as DropdownListControl;
    return kRelayMappings.indexOf(outputTypeControl.getValue());
  }

  private updateHubsStatusReport(node: Node){
    const hubSelect = node.controls.get("hubSelect") as DropdownListControl;
    const hubsChannels = hubSelect.getChannels();
    if (!hubsChannels) return;
    const hubStatusArray: HubStatus[] = hubsChannels
      .filter((c: NodeChannelInfo) => c.deviceFamily === "microbit")
      .map((c: NodeChannelInfo) => {
        return {
          id: c.channelId.charAt(2), // this char is hub identifier
          missing: c.missing
        };
      });

    hubStatusArray.forEach((s: HubStatus) => {
      hubSelect.setActiveOption(s.id, !s.missing);
    });
  }

  private getRelayMessageReceived(node: Node) {
    const hubRelaysState =  this.getHubChannelsForNode(node);
    if (hubRelaysState.length === 0) return "";
    hubRelaysState.filter((c: NodeChannelInfo) => c.type === "relays")[0].relaysState;
    const valueOfRelayAtIndex = hubRelaysState[this.getSelectedRelayIndex(node)];
    return node.data.nodeValue === valueOfRelayAtIndex ? "(recieved)" : "(sent)";
  }

  // TODO IMPROVEMENT - this is a duplicate method - abstract for all factories?
  private addInput(node: Node, inputKey: string, displayLabel = "") {
    if (this.editor) {
      const oldInput = node.inputs.get(inputKey);
      if (!oldInput) {
        const input = new Rete.Input(inputKey, "Number", this.numSocket);
        node.addInput(input);
        input.addControl(new InputValueControl(
          this.editor,
          inputKey,
          node,
          () => {
            node.data.plot = !node.data.plot;
            this.editor?.trigger("process");
            const toggleStr = node.data.plot ? "on" : "off";
            const tileId = node.meta.inTileWithId as string;
            dataflowLogEvent(`toggle minigraph ${toggleStr}`, node, tileId);
          },
          displayLabel,
          0, // Initial value
          `Display for ${inputKey}`,
          '', // Initial display message
          (node as any).data.watchedValues[inputKey].backgroundColor,
          (node as any).data.watchedValues[inputKey].borderColor,
          (val: any) => {
            return typeof val === "number" ? val : 1;
          }
        ));
      }
    }
  }

  private removeInput(node: Node, inputKey: string) {
    const input = node.inputs.get(inputKey);
    if (input && this.editor) {
      input.connections.slice().map(this.editor.removeConnection.bind(this.editor));
      node.removeInput(input);
    }
  }
}

