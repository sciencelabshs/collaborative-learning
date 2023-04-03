import { observer } from "mobx-react";
import React from "react";
import { EPanelId, IPanelGroupSpec } from "../../components/app-header";
import { IBaseProps } from "../../components/base";
import { ClassMenuContainer } from "../../components/class-menu-container";
import { NetworkStatus } from "../../components/network-status";
import { ProblemMenuContainer } from "../../components/problem-menu-container";
import { ToggleGroup } from "@concord-consortium/react-components";
import { GroupModelType, GroupUserModelType } from "../../models/stores/groups";
import { CustomSelect } from "./custom-select";
import { useStores } from "../../hooks/use-stores";

// cf. https://mattferderer.com/use-sass-variables-in-typescript-and-javascript
import styles from "./toggle-buttons.scss";

import "./clue-app-header.sass";

interface IProps extends IBaseProps {
  panels: IPanelGroupSpec;
  current: string;
  onPanelChange: (panelId: EPanelId) => void;
  showGroup: boolean;
}

export const ClueAppHeaderComponent: React.FC<IProps> = observer(function ClueAppHeaderComponent(props) {
  const { showGroup } = props;
  const { appConfig, appMode, appVersion, db, user, problem, groups, investigation, ui, unit } = useStores();
  const myGroup = showGroup ? groups.getGroupById(user.currentGroupId) : undefined;
  const userTitle = appMode !== "authed" && appMode !== "demo"
                      ? `Firebase UID: ${db.firebase.userId}` : undefined;

  const renderPanelButtons = () => {
    const { panels, onPanelChange, current} = props;
    if (!panels || (panels.length < 2)) return;

    const panelButtons = panels
      .filter(spec => spec.label.length > 0)
      .map(spec => {
        const { label, panelId } = spec;
        const onClick = () => { onPanelChange?.(panelId); };
        const key = panelId;
        const selected = key === current;
        const colors = panelId === EPanelId.workspace || panelId === EPanelId.dashboard
          ? {
            unselectedColor: {
              color: panelId === EPanelId.workspace
                     ? styles.toggleButtonWorkspaceColor
                     : styles.toggleButtonDashboardColor,
              background: panelId === EPanelId.workspace
                          ? styles.toggleButtonWorkspaceBackgroundColor
                          : styles.toggleButtonDashboardBackgroundColor
            },
            hoverColor: {
              color: panelId === EPanelId.workspace
                     ? styles.toggleButtonWorkspaceColor
                     : styles.toggleButtonDashboardColor,
              background: panelId === EPanelId.workspace
                          ? styles.toggleButtonWorkspaceHoverBackgroundColor
                          : styles.toggleButtonDashboardHoverBackgroundColor
            },
            selectedColor: {
              color: panelId === EPanelId.workspace
                     ? styles.toggleButtonWorkspaceColor
                     : styles.toggleButtonDashboardColor,
              background: panelId === EPanelId.workspace
                          ? styles.toggleButtonWorkspaceSelectedBackgroundColor
                          : styles.toggleButtonDashboardSelectedBackgroundColor,
            }
          }
          : undefined;
        return { label, onClick, key, selected, colors };
      });
    return <ToggleGroup options={panelButtons} />;
  };

  const renderGroup = (group: GroupModelType) => {
    const groupUsers = group.users.slice();
    const userIndex = groupUsers.findIndex((groupUser) => groupUser.id === user.id);
    // Put the main user first to match 4-up colors
    if (userIndex > -1) {
      groupUsers.unshift(groupUsers.splice(userIndex, 1)[0]);
    }
    return (
      <div onClick={handleResetGroup} className="group">
        <div className="name" data-test="group-name">{`Group ${group.id}`}</div>
        <div className="group-center"/>
        <div className="members" data-test="group-members">
          <div className="row">
            {renderGroupUser(groupUsers, 0, "nw")}
            {renderGroupUser(groupUsers, 1, "ne")}
          </div>
          <div className="row">
            {renderGroupUser(groupUsers, 3, "sw")}
            {renderGroupUser(groupUsers, 2, "se")}
          </div>
        </div>
      </div>
    );
  };

  const renderGroupUser = (groupUsers: GroupUserModelType[], index: number, direction: "nw" | "ne" | "se" | "sw") => {
    if (groupUsers.length <= index) {
      return (
        <div key={`empty-${index}`} className={`member empty ${direction}`}/>
      );
    }

    const groupUser = groupUsers[index];
    const className = `member ${groupUser.connected ? "connected" : "disconnected"}`;
    const title = `${groupUser.name}: ${groupUser.connected ? "connected" : "disconnected"}`;
    return (
      <div
        key={groupUser.id}
        className={`${className} ${direction}`}
        title={title}
      >
        <div className="initials">{groupUser.initials}</div>
      </div>
    );
  };

  const handleResetGroup = () => {
    ui.confirm("Do you want to leave this group?", "Leave Group")
      .then((ok) => {
        if (ok) {
          db.leaveGroup();
        }
      });
  };

  const renderTeacherHeader = () => {
    return (
      <div className="app-header">
        <div className="left">
          <div className="unit" data-test="investigation-title">
            <div className="title">
              {unit.title}
            </div>
            <div className="investigation">
              {investigation.title}
            </div>
          </div>
          <div className="separator"/>
          <div className="problem-dropdown" data-test="user-class">
            <ProblemMenuContainer />
          </div>
        </div>
        <div className="middle">
          {renderPanelButtons()}
        </div>
        <div className="right">
          <div className="version">Version {appVersion}</div>
          <div className="user teacher" title={userTitle}>
            <div className="class" data-test="user-class">
              <ClassMenuContainer />
            </div>
            <div className="profile-icon teacher">
              <div className="profile-icon-inner"/>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (user.isTeacher && appConfig.showClassSwitcher) {
    return renderTeacherHeader();
  }

  return (
      <div className="app-header">
        <div className="left">
          <div className="unit">
            <div className="title" data-test="unit-title">
              {unit.title}
            </div>
            <div className="investigation" data-test="investigation">
              {investigation.title}
            </div>
          </div>
          <div className="separator"/>
          <CustomSelect
            items={[{text: `${problem.title}${problem.subtitle ? `: ${problem.subtitle}`: ""}`}]}
            isDisabled={true}
          />
        </div>
        <div className="middle student">
          {renderPanelButtons()}
        </div>
        <div className="right">
          <NetworkStatus user={user}/>
          <div className="version">Version {appVersion}</div>
          {myGroup ? renderGroup(myGroup) : null}
          <div className="user" title={userTitle}>
            <div className="user-contents">
              <div className="name" data-test="user-name">{user.name}</div>
              <div className="class" data-test="user-class">{user.className}</div>
            </div>
            <div className="profile-icon">
              <div className="profile-icon-inner"/>
            </div>
          </div>
        </div>
      </div>
    );
});
