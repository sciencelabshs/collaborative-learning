import Rete, { Node, Socket } from "rete";
import { NodeData } from "rete/types/core/data";
import { DataflowReteNodeFactory, kEmptyValueString } from "./dataflow-rete-node-factory";
import { ValueControl } from "../controls/value-control";
import { DropdownListControl } from "../controls/dropdown-list-control";
import { NodeControlTypes, roundNodeValue } from "../../model/utilities/node";
import { PlotButtonControl } from "../controls/plot-button-control";

export class ControlReteNodeFactory extends DataflowReteNodeFactory {
  constructor(numSocket: Socket) {
    super("Control", numSocket);
  }

  private heldValue: number | null = null;
  private result = 0;
  private resultSentence = "";

  public builder(node: Node) {
    super.defaultBuilder(node);
    if (this.editor) {
      const inp1 = new Rete.Input("num1", "Number", this.numSocket);
      const inp2 = new Rete.Input("num2", "Number2", this.numSocket);
      const out = new Rete.Output("num", "Number", this.numSocket);

      const dropdownOptions = NodeControlTypes
        .filter((nodeOp) => {
          return nodeOp.type === "control";
        }).map((nodeOp) => {
          return { name: nodeOp.name, icon: nodeOp.icon };
        });
      return node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new DropdownListControl(this.editor, "controlOperator", node, dropdownOptions, true))
        .addControl(new PlotButtonControl(this.editor, "plot", node))
        .addControl(new ValueControl(this.editor, "nodeValue", node))
        .addOutput(out) as any;
    }
  }

  private setHoldModValue(n1:number, n2: number, prior: number, funcName: string) :number {
    if (funcName === "Output Zero"){
      this.heldValue = null;
      return 0;
    }

    else if (funcName === "Hold Current"){
      if (this.heldValue === null){
        this.heldValue = n2;
      }
      return this.heldValue;
    }

    else if (funcName === "Hold Prior"){
      if (this.heldValue === null){
        this.heldValue = prior;
      }
      return this.heldValue;
    }

    else {
      return 0;
    }
  }

  public worker(node: NodeData, inputs: any, outputs: any) {
    const funcName = node.data.controlOperator as string;
    const recents: number[] = (node.data.recentValues as any).nodeValue;
    const priorValue: number | undefined = recents[recents.length - 1];
    const n1 = inputs.num1.length ? inputs.num1[0] : node.data.num1;
    const n2 = inputs.num2 ? (inputs.num2.length ? inputs.num2[0] : node.data.num2) : 0;

    if (isNaN(n2)) {
      // invalid input to n2, no output
      this.result = NaN;
    }

    else {
      if (n1 === 0){
        // off signal at gate, null heldValue and let n2 through
        this.heldValue = null;
        this.result = n2;
      }
      else if (n1 === 1){
        // on signal at gate, set or maintain modified value
        this.result = this.setHoldModValue(n1, n2, priorValue, funcName);
      }
      else {
        // invalid signal at gate
        this.result = NaN;
      }
    }

    // prepare string to display on node
    const resultString = isNaN(this.result) ? kEmptyValueString : `${roundNodeValue(this.result)}`;
    this.resultSentence = `ƒ(${n1}, ${roundNodeValue(n2)}) ⇒ ${resultString}`;

    // operate rete
    if (this.editor) {
      const _node = this.editor.nodes.find((n: { id: any; }) => n.id === node.id);
      if (_node) {
        const nodeValue = _node.controls.get("nodeValue") as ValueControl;
        nodeValue && nodeValue.setValue(this.result);
        nodeValue && nodeValue.setSentence(this.resultSentence);
        this.editor.view.updateConnections( {node: _node} );
      }
    }
    outputs.num = this.result;
  }
}
