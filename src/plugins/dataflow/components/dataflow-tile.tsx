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

@inject("stores")
@observer
export default class DataflowToolComponent extends BaseComponent<IProps> {

  public static tileHandlesSelection = true;

  public render() {

    // console.log("⚡ ⚡ ⚡ class <DataflowToolComponent> with props", this.props);
    const { readOnly, height, model } = this.props;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `dataflow-tool disable-tile-content-drag ${editableClass}`;
    const { program, programDataRate, programZoom, programRecordState } = this.getContent();
    const numNodes = program.nodes.size;
    // console.log("numBlocks", numBlocks.size);
    // console.log("⚡ ⚡ ⚡ class <DataflowToolComponent>  this.getContent()", this.getContent());

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
                  program={program}
                  onProgramChange={this.handleProgramChange}
                  programDataRate={programDataRate}
                  onProgramDataRateChange={this.handleProgramDataRateChange}
                  programZoom={programZoom}
                  onZoomChange={this.handleProgramZoomChange}
                  size={size}
                  tileHeight={height}
                  tileId={model.id}
                  onRecordDataChange={this.handleRecordDataChange}
                  programRecordState={programRecordState}
                  numNodes={numNodes}
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
    // console.log("handleProgramDataRateChange with program:", program);
    this.getContent().setProgramDataRate(program);
  };

  private handleProgramZoomChange = (dx: number, dy: number, scale: number) => {
    // console.log("handleProgramZoomChange with dx:", dx, "dy:", dy, "scale:", scale);
    this.getContent().setProgramZoom(dx, dy, scale);
  };
  private handleRecordDataChange = () => {
    this.getContent().setProgramRecordState();
  };


  private getContent() {
    return this.props.model.content as DataflowContentModelType;
  }
}
