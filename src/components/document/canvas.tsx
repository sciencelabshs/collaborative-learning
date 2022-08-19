import { each } from "lodash";
import { inject, observer } from "mobx-react";
import React from "react";
import { DocumentLoadingSpinner } from "./document-loading-spinner";
import { BaseComponent } from "../base";
import { DocumentContentComponent } from "./document-content";
import { DocumentModelType } from "../../models/document/document";
import { DocumentContentModelType } from "../../models/document/document-content";
import { transformCurriculumImageUrl } from "../../models/tools/image/image-import-export";
import { PlaybackComponent } from "../playback/playback";
import {
  IToolApi, IToolApiInterface, IToolApiMap, ToolApiInterfaceContext, EditableToolApiInterfaceRefContext
} from "../tools/tool-api";
import { HotKeys } from "../../utilities/hot-keys";
import { DEBUG_CANVAS } from "../../lib/debug";

import "./canvas.sass";

interface IProps {
  context: string;
  scale?: number;
  readOnly?: boolean;
  document?: DocumentModelType;
  content?: DocumentContentModelType;
  showPlayback?: boolean;
  showPlaybackControls?: boolean;
  overlayMessage?: string;
  selectedSectionId?: string | null;
  viaTeacherDashboard?: boolean;
  onTogglePlaybackControls?: () => void;
}

@inject("stores")
@observer
export class CanvasComponent extends BaseComponent<IProps> {

  private toolApiMap: IToolApiMap = {};
  private toolApiInterface: IToolApiInterface;
  private hotKeys: HotKeys = new HotKeys();

  static contextType = EditableToolApiInterfaceRefContext;
  declare context: React.ContextType<typeof EditableToolApiInterfaceRefContext>;

  constructor(props: IProps) {
    super(props);

    this.toolApiInterface = {
      register: (id: string, toolApi: IToolApi) => {
        this.toolApiMap[id] = toolApi;
      },
      unregister: (id: string) => {
        delete this.toolApiMap[id];
      },
      getToolApi: (id: string) => {
        return this.toolApiMap[id];
      },
      forEach: (callback: (api: IToolApi) => void) => {
        each(this.toolApiMap, api => callback(api));
      }
    };

    this.hotKeys.register({
      "cmd-shift-s": this.handleCopyDocumentJson,
      "cmd-z": this.handleDocumentUndo,
      "cmd-shift-z": this.handleDocumentRedo
    });
  }

  public render() {
    if (this.context && !this.props.readOnly) {
      // update the editable api interface used by the toolbar
      this.context.current = this.toolApiInterface;
    }
    return (
      <ToolApiInterfaceContext.Provider value={this.toolApiInterface}>
        <div key="canvas" className="canvas" data-test="canvas" onKeyDown={this.handleKeyDown}>
          {this.renderContent()}
          {this.renderDebugInfo()}
          {this.renderOverlayMessage()}
        </div>
      </ToolApiInterfaceContext.Provider>
    );
  }

  private renderContent() {
    const {content, document, showPlayback, showPlaybackControls, onTogglePlaybackControls, ...others} = this.props;
    const documentContent = content || document?.content; // we only pass in content if it is a problem panel
    const typeClass = document?.type === "planning" ? "planning-doc" : "";

    if (documentContent) {
      return (
        <>
          <DocumentContentComponent content={documentContent}
                                    documentId={document?.key}
                                    typeClass={typeClass}
                                    {...others} />
          {showPlayback && <PlaybackComponent document={document}
                                              showPlaybackControls={showPlaybackControls}
                                              onTogglePlaybackControls={onTogglePlaybackControls} />
          }
        </>
      );
    }
    else {
      return <DocumentLoadingSpinner document={document} />;
    }
  }

  private renderDebugInfo() {
    const { document } = this.props;
    if (document && DEBUG_CANVAS) {
      return (
        <div className="canvas-debug">
          <span style={{fontSize: "1.5em"}}>{document.key}</span>
        </div>
      );
    }
  }

  private renderOverlayMessage() {
    const { overlayMessage } = this.props;
    if (overlayMessage) {
      return (
        <div className="canvas-overlay-message">
          <span style={{fontSize: "1.5em"}}>{overlayMessage}</span>
        </div>
      );
    }
  }

  private handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    this.hotKeys.dispatch(e);
  };

  private handleCopyDocumentJson = () => {
    const {content, document } = this.props;
    const { appConfig, unit } = this.stores;
    const unitBasePath = appConfig.getUnitBasePath(unit.code);
    const documentContent = document?.content ?? content;
    const transformImageUrl = (url?: string, filename?: string) => {
      return transformCurriculumImageUrl(url, unitBasePath, filename);
    };
    const json = documentContent?.exportAsJson({ includeTileIds: true, transformImageUrl });
    json && navigator.clipboard.writeText(json);
  };

  private handleDocumentUndo = () => {
    const { document } = this.props;
    document?.undoLastAction();
  };

  private handleDocumentRedo = () => {
    const { document } = this.props;
    document?.redoLastAction();
  };
}
