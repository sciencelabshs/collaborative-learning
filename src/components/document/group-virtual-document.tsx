import { inject, observer } from "mobx-react";
import React from "react";
import { FourUpComponent } from "../four-up";
import { BaseComponent, IBaseProps } from "../base";
import { IGroupVirtualDocument, GroupVirtualDocument } from "../../models/document/group-virtual-document";
import { WorkspaceModelType } from "../../models/stores/workspace";

import "./group-virtual-document.sass";
import { LogEventName, Logger } from "../../lib/logger";

export type WorkspaceSide = "primary" | "comparison";

interface IProps extends IBaseProps {
  workspace: WorkspaceModelType;
  document: IGroupVirtualDocument;
  side: WorkspaceSide;
}

interface IState {
  documentKey: string;
  isCommentDialogOpen: boolean;
}

@inject("stores")
@observer
export class GroupVirtualDocumentComponent extends BaseComponent<IProps, IState> {
/*
  NP/DL: 2019-10-15 -- Provides a view component for "GroupVirtualDocuments"
  SEE: `src/models/document/group-virtual-document`

  This work helps teachers quickly switch between multiple compare views of
  different workgroups.

  See PT Stories:
  https://www.pivotaltracker.com/story/show/168619033
  https://www.pivotaltracker.com/story/show/168711827
*/
  constructor(props: IProps) {
    super(props);
    this.state = {
      documentKey: props.document.key,
      isCommentDialogOpen: false
    };
  }

  public render() {
    const { document: { type } } = this.props;
    return (
      <div key="document" className="document">
        {this.renderTitleBar()}
        <div className="canvas-area">{this.render4UpCanvas()}</div>
        {this.renderStatusBar(type)}
      </div>
    );
  }

  private groupButton(groupId: string) {
    const { document } = this.props;
    const thisId = document.id;
    const selected = thisId === groupId;
    const className = `icon group-number ${selected ? "active" : ""}`;
    const clickHandler = () => this.handleGroupClicked(groupId);
    return(
      <div key={groupId} className={className} onClick={clickHandler}>
        <div className="number">G{groupId}</div>
      </div>
    );
  }

  private renderTitleBar() {
    const type = "group";
    const { groups } = this.stores;
    const { document } = this.props;
    const thisId = document.id;
    return (
      <div className={`titlebar ${type}`}>
        <div className="actions">
          { groups.allGroups.map( group => this.groupButton(group.id)) }
        </div>
        <div className="group-title" data-test="document-title">
          Group {thisId}
        </div>
      </div>
    );
  }

  private handleGroupClicked(groupID: string) {
    const { ui } = this.stores;
    Logger.log(LogEventName.VIEW_GROUP, {group: groupID, via: "group-document-titlebar"});
    ui.problemWorkspace.setComparisonDocument(new GroupVirtualDocument({id: groupID}));
  }

  private render4UpCanvas() {
    const { user } = this.stores;
    const { document } = this.props;
    const groupId = document.id;
    return (
      <FourUpComponent
        userId={ user.id }
        groupId={ groupId }
        isGhostUser={true} />
    );
  }
  private isPrimary() {
    return this.props.side === "primary";
  }

  private handleToggleTwoUp = () => {
    const { workspace } = this.props;
    const currMode = workspace.hidePrimaryForCompare || false;
    this.props.workspace.toggleComparisonVisible({override: true, hidePrimary: !currMode });
  }

  private renderTwoUpButton() {
    const { workspace } = this.props;
    const currMode = workspace.hidePrimaryForCompare ? "up1" : "up2";
    const nextMode = workspace.hidePrimaryForCompare ? "up2" : "up1";

    return (
      <div className="mode action">
        <svg id="currMode" className={`mode icon icon-${currMode}`} data-test="two-up-curr-mode"
             onClick={this.handleToggleTwoUp}>
          <use xlinkHref={`#icon-${currMode}`} />
        </svg>
        <svg id="nextMode" key="nextMode" className={`mode icon icon-${nextMode}`} data-test="two-up-next-mode"
             onClick={this.handleToggleTwoUp}
        >
          <use xlinkHref={`#icon-${nextMode}`} />
        </svg>
      </div>
    );
  }

  private renderStatusBar(type: string) {
    const isPrimary = this.isPrimary();
    return (
      <div className={`statusbar ${type}`}>
        <div className="supports">
          {null}
        </div>
        <div className="actions">
          {isPrimary ? this.renderTwoUpButton() : null}
        </div>
      </div>
    );
  }
}
