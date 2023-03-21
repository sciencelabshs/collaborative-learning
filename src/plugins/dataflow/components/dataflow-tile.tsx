import React from "react";
import { SizeMe, SizeMeProps } from "react-sizeme";
import { observer, inject } from "mobx-react";
import { DataflowProgram } from "./dataflow-program";
import { BaseComponent } from "../../../components/base";
import { ITileModel } from "../../../models/tiles/tile-model";
import { ITileExportOptions } from "../../../models/tiles/tile-content-info";
import { ITileProps } from "../../../components/tiles/tile-component";
import { EditableTileTitle } from "../../../components/tiles/editable-tile-title";
import { DataflowContentModelType } from "../model/dataflow-content";
import { measureText } from "../../../components/tiles/hooks/use-measure-text";
import { defaultTileTitleFont } from "../../../components/constants";
import { ToolTitleArea } from "../../../components/tiles/tile-title-area";
import { dataflowLogEvent } from "../dataflow-logger";

import "./dataflow-tile.scss";

interface IProps extends ITileProps{
  model: ITileModel;
  readOnly?: boolean;
  height?: number;
}

interface IDataflowTileState {
  programRecordingMode: number // shoud be enumerated
}

@inject("stores")
@observer
export default class DataflowToolComponent extends BaseComponent<IProps, IDataflowTileState> {

  public static tileHandlesSelection = true;

  // [RECORDING temporary state]
  constructor(props: IProps) {
    super(props);
    this.state = {
      programRecordingMode: 0
    };
  }

  public render() {
    const { readOnly, height, model } = this.props;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `dataflow-tool disable-tile-content-drag ${editableClass}`;
    const { program, programDataRate, programZoom } = this.getContent();
    const numNodes = program.nodes.size;
    const tileModel = this.getContent();
    //const { programRecordState } = this.state ? this.state.programRecordState

    // 1 Move programRecordState and methods to this component or to a hook
    // 2 QUESTION: consolidate the passed props that now come through with whole model? (see below)
    // 3 implement the before the start assessment and setup
    // 4 implement the record on tick

    return (
      <>
        <ToolTitleArea>{this.renderTitle()}</ToolTitleArea>
        <div className={classes}>
          <SizeMe monitorHeight={true}>
            {({ size }: SizeMeProps) => {
              return (
                <DataflowProgram
                  readOnly={readOnly}
                  documentProperties={this.getDocumentProperties()}
                  program={program} // 1/3 now passing whole tileModel, so destruct this on other side?
                  onProgramChange={this.handleProgramChange}
                  programDataRate={programDataRate}  // 2/3 now passing whole tileModel, so destruct this on other side?
                  onProgramDataRateChange={this.handleProgramDataRateChange}
                  programZoom={programZoom} // 3/3 now passing whole tileModel, so destruct this on other side?
                  onZoomChange={this.handleProgramZoomChange}
                  size={size}
                  tileHeight={height}
                  tileId={model.id}
                  onRecordDataChange={this.handleChangeOfRecordingMode}
                  programRecordState={this.state.programRecordingMode}
                  numNodes={numNodes}
                  tileModel={tileModel}
                />
              );
            }}
          </SizeMe>
        </div>
      </>
    );
  }

  public componentDidMount() {
    this.props.onRegisterTileApi({
      getTitle: () => {
        return this.getTitle();
      },
      exportContentAsTileJson: (options?: ITileExportOptions) => {
        return this.getContent().exportJson(options);
      }
    });

    if (this.getTitle() === '') {
      const { model: { id }, onRequestUniqueTitle } = this.props;
      const title = onRequestUniqueTitle(id);
      title && this.getContent().setTitle(title);
    }
  }

  private getDocument() {
    const { documents, ui: { problemWorkspace: { primaryDocumentKey } } } = this.stores;
    return primaryDocumentKey ? documents.getDocument(primaryDocumentKey) : undefined;
  }

  private getDocumentProperties() {
    const document = this.getDocument();
    return document && document.properties.toJSON();
  }

  private handleTitleChange = (title?: string) => {
    if (title){
      this.getContent().setTitle(title);
      dataflowLogEvent("changeprogramtitle", { programTitleValue: this.getTitle() }, this.props.model.id);
    }
  };

  private renderTitle() {
    const size = {width: null, height: null};
    const { readOnly, scale } = this.props;
    return (
      <EditableTileTitle
        key="dataflow-title"
        size={size}
        scale={scale}
        getTitle={this.getTitle.bind(this)}
        readOnly={readOnly}
        measureText={(text) => measureText(text, defaultTileTitleFont)}
        onEndEdit={this.handleTitleChange}
      />
    );
  }

  private getTitle() {
    return this.getContent().title || "";
  }

  private handleProgramChange = (program: any) => {
    this.getContent().setProgram(program);
  };

  private handleProgramDataRateChange = (program: any) => {
    this.getContent().setProgramDataRate(program);
  };

  private handleProgramZoomChange = (dx: number, dy: number, scale: number) => {
    this.getContent().setProgramZoom(dx, dy, scale);
  };

  // [RECORDING: this will be called when the recording is about to begin
  private pairNodesToAttributes = () => {
    console.log("-----Recording BEGIN-----------");
    const model = this.getContent();

    //#1 check nodes on tile against dataset attributes, if already there do nothing, otherwise write.
    model.program.nodes.forEach((n) => {
      model.addNewAttrFromNode(n.id, n.name);
    });

    //#2 check dataset attributes against nodes on tile, if an attribute is not on the tile - remove it.
    const dataSet = model.dataSet;
    const dataSetAttributes = dataSet.attributes;
    dataSetAttributes.forEach((attribute, idx) => {
      model.removeAttributesInDatasetMissingInTile(attribute.id);
    });
  };

  private writeCase = () => {
    const model = this.getContent();
    model.addNewCaseFromAttrKeys(model.existingAttributes());
    console.log("dataflow-tile.tsx > model.existingAttributes() ", model.existingAttributes());

  };


  private handleChangeOfRecordingMode = () => {
    /* this should be enumerated somehow, but
      0 - cleared, ready to record
      1 - recording in progress
      2 - stopped, ready to clear
    */
    const mode = this.state.programRecordingMode;
    if (mode === 0){
      this.pairNodesToAttributes();
      //clear all the cases?
      this.writeCase();
    }

    this.setState({
      programRecordingMode:  (mode + 1) % 3
    });
  };

  private getContent() {
    return this.props.model.content as DataflowContentModelType;
  }
}
