import React from "react";
import { SizeMe, SizeMeProps } from "react-sizeme";
import { observer, inject } from "mobx-react";
import { DataflowProgram, UpdateMode } from "./dataflow-program";
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
import { addAttributeToDataSet } from "../../../models/data/data-set";
import { DataflowLinkTableButton } from "./ui/dataflow-program-link-table-button";

import "./dataflow-tile.scss";

interface IProps extends ITileProps{
  model: ITileModel;
  readOnly?: boolean;
  height?: number;
}

interface IDataflowTileState {
  // tileContent.programRecordingMode: number; // TODO: convert to enum
  isRecording: boolean;
  isPlaying: boolean;
  playBackIndex: number;
  recordIndex: number; //# of ticks for record
  isEditingTitle: boolean;
}

@inject("stores")
@observer
export default class DataflowToolComponent extends BaseComponent<IProps, IDataflowTileState> {
  public static tileHandlesSelection = true;

  constructor(props: IProps) {
    super(props);
    this.state = {
      isRecording: false,
      // programRecordingMode: 0,
      isPlaying: false,
      playBackIndex: 0,
      recordIndex: 0,
      isEditingTitle: false
    };
  }
  public render() {
    const { readOnly, height, model } = this.props;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `dataflow-tool disable-tile-content-drag ${editableClass}`;
    const { program, programDataRate, programZoom } = this.getContent();
    const numNodes = program.nodes.size;
    const tileContent = this.getContent();

    return (
      <>
        <ToolTitleArea>
          {this.renderTitle()}
          {`programRecordingMode ${tileContent.programRecordingMode}`}
          <br/>
          {`isPlaying ${this.state.isPlaying ? "T" : "F"}`}
          <br/>

          {`isRecording ${this.state.isRecording ? "T" : "F"}`}

          {this.renderTableLinkButton()}

        </ToolTitleArea>
        <div className={classes}>
          <SizeMe monitorHeight={true}>
            {({ size }: SizeMeProps) => {
              return (
                <DataflowProgram
                  readOnly={readOnly}
                  documentProperties={this.getDocumentProperties()}
                  program={program}
                  onProgramChange={this.handleProgramChange}
                  programDataRate={programDataRate}
                  onProgramDataRateChange={this.handleProgramDataRateChange}
                  programZoom={programZoom}
                  onZoomChange={this.handleProgramZoomChange}
                  size={size}
                  tileHeight={height}
                  tileId={model.id}
                  //state
                  programRecordState={tileContent.programRecordingMode}
                  isPlaying={this.state.isPlaying}
                  playBackIndex={this.state.playBackIndex}
                  recordIndex={this.state.recordIndex}
                  //state handlers
                  onRecordDataChange={this.handleChangeOfRecordingMode}
                  handleChangeIsPlaying={this.handleChangeIsPlaying}
                  updatePlayBackIndex={this.updatePlayBackIndex}
                  updateRecordIndex={this.updateRecordIndex}
                  numNodes={numNodes}
                  tileContent={tileContent}
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

    //when recording and program is refreshed, if the dataSet is filled, then increment to Clear mode
    const tileContent = this.getContent();
    if (tileContent.programRecordingMode === 1 && !tileContent.isEmptyDataSet){
      tileContent.incrementProgramRecordingMode();
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

  private handleBeginEditTitle = () => {
    this.setState({isEditingTitle: true});
  };

  private handleTitleChange = (title?: string) => {
    if (title){
      this.getContent().setTitle(title);
      dataflowLogEvent("changeprogramtitle", { programTitleValue: this.getTitle() }, this.props.model.id);
      this.setState({isEditingTitle: false});
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
        onBeginEdit={this.handleBeginEditTitle}
        onEndEdit={this.handleTitleChange}
      />
    );
  }

  private renderTableLinkButton() {
    const { model, onRequestTilesOfType, documentId } = this.props;
    const tileContent = this.getContent();
    const isLinkButtonEnabled = (tileContent.programRecordingMode === 2);

    const actionHandlers = {
                             handleRequestTableLink: this.handleRequestTableLink,
                             handleRequestTableUnlink: this.handleRequestTableUnlink
                           };

    return (!this.state.isEditingTitle && !this.props.readOnly &&
      <DataflowLinkTableButton
        key="link-button"
        isLinkButtonEnabled={isLinkButtonEnabled}
        //use in useTableLinking
        documentId={documentId}
        model={model}
        onRequestTilesOfType={onRequestTilesOfType}
        actionHandlers={actionHandlers}
      />
    );
  }

  private handleRequestTableLink = (tableId: string) => {
    console.log("handleRequestTableLink with tableID;", tableId);
    this.getContent().addLinkedTable(tableId);
  };

  private handleRequestTableUnlink = (tableId: string) => {
    console.log("handleRequestTableUnLink with tableID;", tableId);
    this.getContent().removeLinkedTable(tableId);
  };

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

  private pairNodesToAttributes = () => {
    const model = this.getContent();
    const dataSet = model.dataSet;
    const dataSetAttributes = dataSet.attributes;

    // dataSet looks like
    // Time   |  Node 1 | Node 2 | Node 3 etc
    //    0   |   val    | val    |  val
    addAttributeToDataSet(model.dataSet, { name: "Time (sec)" }); //this is time quantized to nearest sampling rate

    model.program.nodes.forEach((n) => {
      model.addNewAttrFromNode(n.id, n.name);
    });

    // compare dataset attributes against nodes on tile, if an attribute is not on the tile - remove it.
    dataSetAttributes.forEach((attribute, idx) => {
      if (idx >= 1) { //skip 0 index (Time)
        model.removeAttributesInDatasetMissingInTile(attribute.id);
      }
    });
  };

  private handleChangeOfRecordingMode = () => {
    //0 program: executing, dataSet: empty
    //1 program: executing, dataSet: writing in progress
    //2 program: not executing,  dataSet: populated
    //below are "substates" of #2 above
    //isPlaying: playbackIndex incrementing, Nodes updated "by hand" rather than via execution
    //isPaused: playbackIndex not incrementing, nodes stay as they were at last index above

    const tileContent = this.getContent();
    const mode = tileContent.programRecordingMode;

    if (mode === 0){ //when Record is pressed
      this.setState({isPlaying: false}); //reset isPlaying
      this.setState({isRecording: true});
      this.pairNodesToAttributes();
    }

    if (mode === 1){ //Stop Recording
      this.setState({isRecording: false});
    }
    if (mode === 2){ // Clear pressed - remove all dataSet
      //set formattedTime to 000:00
      tileContent.setFormattedTime("000:00");

      const allAttributes = tileContent.dataSet.attributes;
      const ids = tileContent.dataSet.cases.map(({__id__}) => ( __id__));
      tileContent.dataSet.removeCases(ids);
      allAttributes.forEach((attr)=>{
        tileContent.dataSet.removeAttribute(attr.id);
      });
      //add an X Y attribute to the DF shared Dataset,
      // but then we'd have to make sure we clear it when we press record

      //Code
      // tileContent.dataSet.
    }
    tileContent.incrementProgramRecordingMode();
  };

  private handleChangeIsPlaying = () => {
    this.setState({isPlaying: !this.state.isPlaying});
  };

  private updatePlayBackIndex = (update: string) => {
    if (update === UpdateMode.Increment){
      this.setState({playBackIndex: this.state.playBackIndex + 1});
    }
    if (update === UpdateMode.Reset){
      this.setState({playBackIndex: 0});
    }
  };

  private updateRecordIndex = (update: string) => {
    if (update === UpdateMode.Increment){
      this.setState({recordIndex: this.state.recordIndex + 1});
    }
    if (update === UpdateMode.Reset){
      this.setState({recordIndex: 0});
    }
  };

  private getContent() {
    return this.props.model.content as DataflowContentModelType;
  }
}


