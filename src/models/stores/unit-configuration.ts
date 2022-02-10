import { SnapshotIn, types } from "mobx-state-tree";
import { DocumentContentModel } from "../document/document-content";
import { NavTabsConfigModel } from "./nav-tabs";
import { ProblemConfiguration } from "./problem-configuration";

const DocumentSpecModel = types
  .model("DocumentSpec", {
    documentType: types.string,
    properties: types.array(types.string)
  });

export const DocumentLabelModel = types
  .model("DocumentLabel", {
    labels: types.map(types.string)
  })
  .views(self => ({
    getUpperLabel(num?: number) {
      const numLabel = num != null ? self.labels.get(String(num)) : "";
      return numLabel || self.labels.get("n") || "";
    }
  }))
  .views(self => ({
    getLowerLabel(num?: number) {
      return self.getUpperLabel(num).toLowerCase();
    }
  }))
  .views(self => ({
    getLabel(num?: number, lowerCase?: boolean) {
      return lowerCase
              ? self.getLowerLabel(num)
              : self.getUpperLabel(num);
    }
  }));

export interface UnitConfiguration extends ProblemConfiguration {
  // used in application loading message, log messages, etc.
  appName: string;
  // displayed in browser tab/window title
  pageTitle: string;
  // used for demo creator links
  demoProblemTitle: string;
  // default problem to load if none specified
  defaultProblemOrdinal: string;
  // disable grouping of students (e.g. Dataflow)
  autoAssignStudentsToIndividualGroups: boolean;
  // type of user document to create/show by default
  defaultDocumentType: "problem" | "personal";
  // default title of personal documents (problem documents don't have user-assigned titles)
  defaultDocumentTitle: string;
  // following two properties used for displaying titles for documents
  docTimeStampPropertyName: string;
  docDisplayIdPropertyName: string;
  // clients should use the defaultDocumentContent() method below
  defaultDocumentTemplate?: SnapshotIn<typeof DocumentContentModel>;
  // default title of learning log documents
  defaultLearningLogTitle: string;
  // overrides `defaultLearningLogTitle`; not clear why both are required
  initialLearningLogTitle: string;
  // whether to create an initial/default learning log document for each user
  defaultLearningLogDocument: boolean;
  // whether to automatically divide problem documents into sections
  autoSectionProblemDocuments: boolean;
  // array of property names to use when constructing document labels
  documentLabelProperties: string[];
  // terminology for referencing documents
  documentLabels: Record<string, SnapshotIn<typeof DocumentLabelModel>>;
  // disables publishing documents of particular types or with particular properties
  disablePublish: Array<SnapshotIn<typeof DocumentSpecModel>>;
  // configures naming of copied documents
  copyPreferOriginTitle: boolean;
  // enable/disable dragging of tiles
  disableTileDrags: boolean;
  // show the class switcher menu for teachers
  showClassSwitcher: boolean;
  // whether to show one-up/two-up view icons in document title bar
  supportStackedTwoUpView: boolean;
  // whether to show published (non-editable) documents in the editing workspace
  showPublishedDocsInPrimaryWorkspace: boolean;
  // comparison view placeholder content
  comparisonPlaceholderContent: string | string[];
  // configuration of navigation tabs (document navigation UI)
  navTabs: SnapshotIn<typeof NavTabsConfigModel>;
}
