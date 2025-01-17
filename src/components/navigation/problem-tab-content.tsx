import classNames from "classnames";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useProblemPathWithFacet, useUIStore, useUserStore } from "../../hooks/use-stores";
import { getSectionTitle, SectionModelType, findSectionIndex } from "../../models/curriculum/section";
import { ProblemPanelComponent } from "./problem-panel";
import { Logger } from "../../lib/logger";
import { LogEventName } from "../../lib/logger-types";
import ToggleControl from "../utilities/toggle-control";
import { ENavTab } from "../../models/view/nav-tabs";

import "./problem-tab-content.sass";

interface IProps {
  context?: string;   // ENavTab.kTeacherGuide for teacher guide, blank otherwise
  sections: SectionModelType[];
  showSolutionsSwitch: boolean;
}

const kHeaderHeight = 55;
const kWorkspaceContentMargin = 4;
const kNavTabHeight = 34;
const kTabSectionBorderWidth = 2;

export const ProblemTabContent: React.FC<IProps>
  = observer(({ context, sections, showSolutionsSwitch }: IProps) => {
  const { isTeacher } = useUserStore();
  const ui = useUIStore();
  const problemPath = useProblemPathWithFacet(context);
  const { showTeacherContent } = ui;
  const hasSubTabs = sections && sections.length > 1;
  const chatBorder = ui.showChatPanel ? "chat-open" : "";
  const vh = window.innerHeight;
  const headerOffset = hasSubTabs
                        ? kHeaderHeight + (2 * (kWorkspaceContentMargin + kNavTabHeight + kTabSectionBorderWidth))
                        : kHeaderHeight + kNavTabHeight + (2 * (kWorkspaceContentMargin + kTabSectionBorderWidth));
  const problemsPanelHeight = vh - headerOffset;
  const problemsPanelStyle = { height: problemsPanelHeight };
  //per Scott's PR comments we should be using ui.focusDocument instead of keeping this local state [activeIndex]
  const [activeIndex, setActiveIndex] = useState(0); //used to display correct "section" or subtab


  useEffect(() => {
    if (ui.activeNavTab === ENavTab.kProblems) {
      ui.updateFocusDocument();
    }
    setActiveIndex((prevState) => {
      const newIndex = findSectionIndex(sections, ui.focusDocument);
      if (newIndex !== -1) {
        return newIndex;
      } else {
        return prevState;
      }
    });

  }, [sections, ui, ui.focusDocument]);

  const handleTabSelected = (index: number) => {
    const section = sections?.[index];
    if (!section) return;
    // TODO: The log event properties have been reversed for quite a while now.
    // We don't want to introduce a breaking change in the log event stream, so
    // the variables are named for clarity. It might be better to add a version
    // property to the log event so we can fix this.
    const namePropButReallyType = section.type;    
    const typePropButReallyTitle = getSectionTitle(section.type);
    Logger.log(LogEventName.SHOW_TAB_SECTION, {
      tab_section_name: namePropButReallyType,
      tab_section_type: typePropButReallyTitle
    });
    // Clear any selected tiles when the tab changes
    ui.setSelectedTile();
    ui.updateFocusDocument();
    setActiveIndex(index);
  };

  const handleToggleSolutions = () => {
    ui.toggleShowTeacherContent(!showTeacherContent);
    Logger.log(showTeacherContent ? LogEventName.HIDE_SOLUTIONS : LogEventName.SHOW_SOLUTIONS);
  };

  return (
    <Tabs className={classNames("problem-tabs", context, chatBorder)}
          selectedTabClassName="selected"
          selectedIndex={activeIndex || 0}
          onSelect={handleTabSelected}
          data-focus-document={problemPath}
    >
      <div className={classNames("tab-header-row", {"no-sub-tabs": !hasSubTabs})}>
        <TabList className={classNames("tab-list", {"chat-open" : ui.showChatPanel})}>
          {sections?.map((section, index) => {
            const sectionTitle = getSectionTitle(section.type);
            return (
              <Tab
                className={classNames("prob-tab", context)}
                key={`section-${section.type}`}
              >
                {sectionTitle}
              </Tab>
            );
          })}
        </TabList>
        {isTeacher && showSolutionsSwitch &&
          <SolutionsButton onClick={handleToggleSolutions} isToggled={showTeacherContent} />}
      </div>
      <div className="problem-panel" style={problemsPanelStyle}>
        {sections?.map((section) => {
          return (
            <TabPanel key={`section-${section.type}`} data-focus-section={section.type}>
              <ProblemPanelComponent section={section} key={`section-${section.type}`} />
            </TabPanel>
          );
        })}
      </div>
    </Tabs>
  );
});

const SolutionsButton = ({ onClick, isToggled }: { onClick: () => void, isToggled: boolean }) => {
  const classes = classNames("solutions-button", { toggled: isToggled });
  return (
    <div className="solutions-switch">
      <ToggleControl className={classes} dataTest="solutions-button"
                      initialValue={isToggled} onChange={onClick}
                      title={isToggled
                                  ? "Showing solutions: click to hide"
                                  : "Hiding solutions: click to show"} />
      <div className="solutions-label">Solutions</div>
    </div>
  );
};
