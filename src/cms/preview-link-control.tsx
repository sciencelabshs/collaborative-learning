import React from "react";
import { CmsWidgetControlProps } from "netlify-cms-core";

import { defaultCurriculumBranch } from "./cms-constants";
import { urlParams } from "../utilities/url-params";

import "./custom-control.scss";
import "./preview-link-control.scss";

(window as any).DISABLE_FIREBASE_SYNC = true;

interface IState {
  warning?: string;
  previewUrl?: string;
}

const delayWarning = " (Your changes may take a minute or two to appear after publishing.)";

// We are using the CmsWidgetControlProps for the type of properties passed to
// the control. This doesn't actually include all of the properties that are
// available. A more complete list can be found in Widget.js in the DecapCMS
// source code.
export class PreviewLinkControl extends React.Component<CmsWidgetControlProps, IState>  {
  constructor(props: CmsWidgetControlProps) {
    super(props);

    // Set up preview link
    let warning = "";
    const baseUrl = `https://collaborative-learning.concord.org`;
    // TODO Do we ever want to preview on a CLUE branch other than master?
    const clueBranch = "master";
    const curriculumBranch = urlParams.curriculumBranch ?? defaultCurriculumBranch;

    // entry is not included in CmsWidgetControlProps, but it is included in the props.
    const entry = (this.props as any).entry.toJS();
    // path is of the form
    // curriculum/[unit]/teacher-guide?/investigation-[ordinal]/problem-[ordinal]/[sectionType]/content.json
    const pathParts = entry.path.split("/");
    const teacherGuideOffset = pathParts[2] === "teacher-guide" ? 1 : 0;

    // If there's a unit url parameter, use that. Otherwise try to find the unit from the entry path.
    const defaultUnit = "sas";
    if (!urlParams.unit && !pathParts[1]) {
      warning = `Could not determine unit. Using default ${defaultUnit}.`;
    }
    const unit = urlParams.unit ?? pathParts[1] ?? defaultUnit;
    const previewUnit = `https://models-resources.concord.org/clue-curriculum/branch/${curriculumBranch}/${unit}/content.json`;

    // Determine the problem from the path
    const defaultInvestigationOrdinal = 1;
    const investigationName = pathParts[2 + teacherGuideOffset];
    const _investigationOrdinal = investigationName.split("investigation-")[1];
    if (!_investigationOrdinal) {
      warning = `Could not determine investigation. Using default ${defaultInvestigationOrdinal}.`;
    }
    const investigationOrdinal = _investigationOrdinal ?? defaultInvestigationOrdinal;
    const defaultProblemOrdinal = 1;
    const problemName = pathParts[3 + teacherGuideOffset];
    const _problemOrdinal = problemName.split("problem-")[1];
    if (!_problemOrdinal) {
      warning = `Could not determine problem. Using default ${defaultProblemOrdinal}.`;
    }
    const problemOrdinal = _problemOrdinal ?? 1;
    const problemParam = `${investigationOrdinal}.${problemOrdinal}`;

    const sectionType = pathParts[4 + teacherGuideOffset];

    const params = `?unit=${previewUnit}&problem=${problemParam}&section=${sectionType}`;
    // TODO It would be better to use the github user for the demoName rather than the curriculum branch.
    const demoParams = `&appMode=demo&domeName=${curriculumBranch}&fakeClass=1&fakeUser=teacher:2`;
    const previewUrl = `${baseUrl}/branch/${clueBranch}/${params}${demoParams}`;

    this.state = {
      warning,
      previewUrl
    };
  }

  render() {
    return (
      <div className="preview-link-box custom-widget">
        <p>
          <a href={this.state.previewUrl} target="_blank" rel="noreferrer">Preview Link</a>
          {delayWarning}
        </p>
        { this.state.warning &&
          <p className="warning">Preview link may be incorrect. {this.state.warning}</p>
        }
      </div>
    );
  }
}
