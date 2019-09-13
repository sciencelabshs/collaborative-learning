import { Button, ButtonGroup, Popover, Position, Menu, MenuItem } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { GroupModelType, GroupUserModelType } from "../models/stores/groups";

import "./utilities/blueprint.sass";
import "./app-header.sass";
import { ClassMenuContainer } from "./class-menu-container";

export interface IPanelSpec {
  panelId: string;
  label: string;
  content: JSX.Element;
}
export type IPanelGroupSpec = IPanelSpec[];

interface IProps extends IBaseProps {
  isGhostUser: boolean;
  panels: IPanelGroupSpec;
  current: string;
  onPanelChange: (panel: string) => void;
  showGroup: boolean;
}

@inject("stores")
@observer
export class AppHeaderComponent extends BaseComponent<IProps, {}> {

  public render() {
    const { showGroup } = this.props;
    const {appConfig, appMode, appVersion, db, user, problem, groups} = this.stores;
    const myGroup = showGroup ? groups.groupForUser(user.id) : undefined;
    const userTitle = appMode !== "authed" ? `Firebase UID: ${db.firebase.userId}` : undefined;

    if (user.isTeacher && appConfig.showClassSwitcher) {
      return this.renderTeacherHeader(userTitle);
    }

    return (
      <div className="app-header">
        <div className="left">
          <div>
            <div className="problem" data-test="problem-title">{problem.fullTitle}</div>
            <div className="class" data-test="user-class">{user.className}</div>
          </div>
        </div>
        <div className="middle">
          {this.renderPanelButtons()}
        </div>
        <div className="right">
          <div className="version">Version {appVersion}</div>
          {myGroup ? this.renderGroup(myGroup) : null}
          <div className="user">
            <div className="name" title={userTitle} data-test="user-name">{user.name}</div>
          </div>
        </div>
      </div>
    );
  }

  private renderTeacherHeader(userTitle: string | undefined) {
    const { investigation, user } = this.stores;
    return (
      <div className="app-header">
        <div className="left">
          <div className="problem" data-test="investigation-title">
            {investigation.title}
          </div>
          <div>
            {this.renderProblemPopover()}
          </div>
        </div>
        <div className="middle">
          {this.renderPanelButtons()}
        </div>
        <div className="right">
          <div className="class" data-test="user-class">
            {this.renderClassPopover()}
          </div>
          <div className="class" data-test="user-class">
            <ClassMenuContainer />
          </div>
          <div className="name" title={userTitle} data-test="user-name">
            {user.name}
          </div>
        </div>
      </div>
    );
  }

  private renderClassPopover() {
    const { user } = this.stores;
    return (
      <Popover className="problemMenu"
        content={this.renderClassMenu(user.className)} position={Position.RIGHT_TOP}>
        <Button text={user.className} />
      </Popover>
    );
  }

  private renderClassMenu(currentClassName: string) {
    const { user } = this.stores;
    let key = 0;
    const handleMenuItem = (e: React.MouseEvent) => {
      // tslint:disable-next-line:no-console
      console.log(`Class menu selection: ${(e.target as HTMLElement).innerText}`);
    };
    if (user.portalClasses.length <= 0) {
      // If we don't have a list of classes, populate the menu with with this
      // class, at least. Otherwise, it makes for an ugly, empty menu.
      return (
        <Menu>
          <MenuItem key={key++} text={user.className} active={true} />
        </Menu>
      );
    }
    return (
      <Menu>
        {user.portalClasses.map( c => <MenuItem key={key++} text={c.className}
        active={c.className === currentClassName} onClick={handleMenuItem} />)}
      </Menu>
    );
  }

  private renderProblemPopover() {
    const { problem } = this.stores;
    return (
      <Popover className="problemMenu" content={this.renderProblemMenu(problem.title)}
        position={Position.RIGHT_TOP}>
        <Button text={problem.title} />
      </Popover>
    );
  }

  private renderProblemMenu(currentProblemTitle: string) {
    const { unit, user } = this.stores;
    const investigations = unit.investigations;
    interface IMenuListItem {
      isAssigned: boolean;
      title: string;
      link: string;
    }
    const menuList: IMenuListItem[] = [];
    let key = 0;
    investigations.forEach( (investigation) => {
      const problems = investigation.problems;
      problems.forEach( (problem) => {
        const portalProblem = user.portalProblems.find( (pid) =>
          pid.problemDesignator === `${investigation.ordinal}.${problem.ordinal}`);
        if (portalProblem) {
          menuList.push({ isAssigned: true, title: problem.title, link: portalProblem.switchUrlLocation });
        }
        else {
          menuList.push({ isAssigned: false, title: problem.title + " -NA-", link: ""});
        }
      });
    });
    const handleMenuItem = (link: string, isActive: boolean) => {
      return ( (e: React.MouseEvent<HTMLElement>) => {
        const newLink = window.location.origin + window.location.pathname + link;
        if (link && link !== "" && ! isActive) {
          window.location.replace(newLink);
        }
      });
    };
    return (
      <Menu>
        {
          menuList.map( menuItem =>
            <MenuItem key={key++}
                      text={menuItem.title}
                      onClick={handleMenuItem(menuItem.link, menuItem.title === currentProblemTitle)}
                      disabled={! menuItem.isAssigned}
                      active={menuItem.title === currentProblemTitle}
            />
          )
        }
      </Menu>
    );
  }

  private renderPanelButtons() {
    const { panels } = this.props;
    if (!panels || (panels.length < 2)) return;

    interface IPanelButtonProps {
      panelId: string;
      label: string;
      current: string;
      onPanelChange: (panel: string) => void;
    }

    const PanelButton: React.FC<IPanelButtonProps> = (props) => {
      const { panelId, label, current, onPanelChange } = props;
      const handlePanelChange = () => { onPanelChange && onPanelChange(panelId); };
      return (
        <Button active={current === panelId}
                disabled={(current !== panelId) && !onPanelChange}
                onClick={handlePanelChange}>
          {label}
        </Button>
      );
    };

    const panelButtons = panels.map(spec => {
      return (
        <PanelButton
          key={spec.panelId}
          panelId={spec.panelId}
          label={spec.label}
          current={this.props.current}
          onPanelChange={this.props.onPanelChange} />
      );
    });

    return (
      <ButtonGroup>
        {panelButtons}
      </ButtonGroup>
    );
  }

  private renderGroup(group: GroupModelType) {
    const {user} = this.stores;
    const groupUsers = group.users.slice();
    const userIndex = groupUsers.findIndex((groupUser) => groupUser.id === user.id);
    // Put the main user first to match 4-up colors
    if (userIndex > -1) {
      groupUsers.unshift(groupUsers.splice(userIndex, 1)[0]);
    }
    return (
      <div className="group">
        <div onClick={this.handleResetGroup} className="name" data-test="group-name">{`Group ${group.id}`}</div>
        <div className="members" data-test="group-members">
          <div className="row">
            {this.renderGroupUser(groupUsers, 0, "nw")}
            {this.renderGroupUser(groupUsers, 1, "ne")}
          </div>
          <div className="row">
            {this.renderGroupUser(groupUsers, 3, "sw")}
            {this.renderGroupUser(groupUsers, 2, "se")}
          </div>
        </div>
      </div>
    );
  }

  private renderGroupUser(groupUsers: GroupUserModelType[], index: number, direction: "nw" | "ne" | "se" | "sw") {
    if (groupUsers.length <= index) {
      return (
        <div key={`empty-${index}`} className={`member empty ${direction}`}/>
      );
    }

    const user = groupUsers[index];
    const className = `member ${user.connected ? "connected" : "disconnected"}`;
    const title = `${user.name}: ${user.connected ? "connected" : "disconnected"}`;
    return (
      <div
        key={user.id}
        className={`${className} ${direction}`}
        title={title}
      >
        <div className="initials">{user.initials}</div>
      </div>
    );
  }

  private handleResetGroup = () => {
    const {isGhostUser} = this.props;
    const {ui, db, groups} = this.stores;
    ui.confirm("Do you want to leave this group?", "Leave Group")
      .then((ok) => {
        if (ok) {
          if (isGhostUser) {
            groups.ghostGroup();
          }
          else {
            db.leaveGroup();
          }
        }
      });
  }
}
