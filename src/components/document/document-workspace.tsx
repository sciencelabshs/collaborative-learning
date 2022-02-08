import { inject, observer } from "mobx-react";
import React from "react";
import { DocumentComponent, WorkspaceSide } from "../../components/document/document";
import { GroupVirtualDocumentComponent } from "../../components/document/group-virtual-document";
import { BaseComponent, IBaseProps } from "../../components/base";
import { DocumentModelType } from "../../models/document/document";
import { createDefaultSectionedContent } from "../../models/document/document-content";
import {
  DocumentDragKey, LearningLogDocument, OtherDocumentType, PersonalDocument, ProblemDocument
} from "../../models/document/document-types";
import { kDividerHalf, kDividerMax, kDividerMin } from "../../models/stores/ui-types";
import { getNavTabConfigFromStores } from "../../models/stores/stores";
import { ImageDragDrop } from "../utilities/image-drag-drop";
import { NavTabPanel } from "../navigation/nav-tab-panel";
import { CollapsedResourcesTab } from "../navigation/collapsed-resources-tab";
import { CollapsedWorkspaceTab } from "./collapsed-workspace-tab";
import { ResizePanelDivider } from "./resize-panel-divider";

import "./document-workspace.sass";

interface IProps extends IBaseProps {
}

@inject("stores")
@observer
export class DocumentWorkspaceComponent extends BaseComponent<IProps> {
  private imageDragDrop: ImageDragDrop;

  constructor(props: IProps) {
    super(props);

    this.imageDragDrop = new ImageDragDrop({
      isAcceptableImageDrag: this.isAcceptableImageDrag
    });
  }

  public componentDidMount() {
    this.guaranteeInitialDocuments();
  }

  public render() {
    const { ui: { problemWorkspace: {type},
                  workspaceShown
                }
          } = this.stores;
    const showNavPanel = getNavTabConfigFromStores(this.stores)?.showNavPanel;
    // NOTE: the drag handlers are in three different divs because we cannot overlay
    // the renderDocuments() div otherwise the Cypress tests will fail because none
    // of the html elements in the documents will be visible to it.  The first div acts
    // as a handler for the background and the left and right nav then delegate dragging
    // and dropping to the same functions
    return (
      <div className="document-workspace">
        <div
          className="drag-handler"
          onDragOver={this.handleDragOverWorkspace}
          onDrop={this.handleImageDrop}
        />
        {showNavPanel && this.renderNavTabPanel()}
        {workspaceShown ? this.renderDocuments()
                        : <CollapsedWorkspaceTab
                            onExpandWorkspace={this.toggleExpandWorkspace}
                            workspaceType={type}
                          />
        }
      </div>
    );
  }

  private getDefaultDocumentContent() {
    const { appConfig: { autoSectionProblemDocuments, defaultDocumentType, defaultDocumentContent },
            problem } = this.stores;
    if ((defaultDocumentType === ProblemDocument) && autoSectionProblemDocuments) {
      // for problem documents, default content is a section header row and a placeholder tile
      // for each section that is present in the corresponding problem content
      return createDefaultSectionedContent(problem.sections);
    }
    else if (defaultDocumentContent) {
      return defaultDocumentContent;
    }
  }

  private async guaranteeInitialDocuments() {
    const { appConfig: {
              defaultDocumentType, defaultLearningLogDocument, defaultLearningLogTitle, initialLearningLogTitle },
            db, ui: { problemWorkspace }, unit: { planningDocument }, user: { type: role } } = this.stores;
    if (!problemWorkspace.primaryDocumentKey) {
      const documentContent = this.getDefaultDocumentContent();
      const defaultDocument = await db.guaranteeOpenDefaultDocument(defaultDocumentType, documentContent);
      if (defaultDocument) {
        problemWorkspace.setPrimaryDocument(defaultDocument);
      }
    }
    // Guarantee the user starts with one learning log
    defaultLearningLogDocument && await db.guaranteeLearningLog(initialLearningLogTitle || defaultLearningLogTitle);
    planningDocument?.isEnabledForRole(role) && planningDocument.default &&
      await db.guaranteePlanningDocument(planningDocument.sections);
  }

  private renderDocuments() {
    const {appConfig, documents, ui, groups} = this.stores;
    const { problemWorkspace } = ui;
    const { comparisonDocumentKey, hidePrimaryForCompare, comparisonVisible} = problemWorkspace;
    const showPrimary = !hidePrimaryForCompare;
    const primaryDocument = this.getPrimaryDocument(problemWorkspace.primaryDocumentKey);
    const comparisonDocument = comparisonDocumentKey
                               && documents.getDocument(comparisonDocumentKey);

    const groupVirtualDocument = comparisonDocumentKey
      && groups.virtualDocumentForGroup(comparisonDocumentKey);

    const toolbar = appConfig.toolbar;

    if (!primaryDocument) {
      return this.renderDocument("single-workspace", "primary");
    }

    const CompareDocument = groupVirtualDocument
      ? <GroupVirtualDocumentComponent
          key={comparisonDocumentKey}
          document={groupVirtualDocument}
        />
      : comparisonDocument
        ?
          <DocumentComponent
            document={comparisonDocument}
            workspace={problemWorkspace}
            onNewDocument={this.handleNewDocument}
            onCopyDocument={this.handleCopyDocument}
            onDeleteDocument={this.handleDeleteDocument}
            onPublishSupport={this.handlePublishSupport}
            onPublishDocument={this.handlePublishDocument}
            toolbar={toolbar}
            side="comparison"
            readOnly={true}
          />
        : this.renderComparisonPlaceholder();

    const Primary =
      <DocumentComponent
        document={primaryDocument}
        workspace={problemWorkspace}
        onNewDocument={this.handleNewDocument}
        onCopyDocument={this.handleCopyDocument}
        onDeleteDocument={this.handleDeleteDocument}
        onPublishSupport={this.handlePublishSupport}
        onPublishDocument={this.handlePublishDocument}
        toolbar={toolbar}
        side="primary"
      />;

    // Show Primary and comparison docs:
    if (comparisonVisible && showPrimary) {
      return (
        <div onClick={this.handleClick}>
          { this.renderDocument("left-workspace", "primary", Primary) }
          { this.renderDocument("right-workspace", "comparison", CompareDocument) }
        </div>
      );
    }
    // Just display the "Compare" document.
    else if (hidePrimaryForCompare) {
      return this.renderDocument("single-workspace", "primary", CompareDocument);
    }
    // Just display the primary document:
    else {
      return this.renderDocument("single-workspace", "primary", Primary);
    }
  }

  private renderDocument(className: string, side: WorkspaceSide, child?: JSX.Element) {
    const { ui,  } = this.stores;
    const showNavPanel = getNavTabConfigFromStores(this.stores)?.showNavPanel;
    const workspaceLeft = !showNavPanel? 0 : ui.navTabContentShown ? "50%" : 42;
    const style = { left: workspaceLeft };
    const roleClassName = side === "primary" ? "primary-workspace" : "reference-workspace";
    return (
      <div
        className={`${className} ${roleClassName}`}
        style={style}
        onDragOver={this.handleDragOverSide}
        onDrop={this.handleDropSide(side)}
        onClick={this.handleClick}
      >
        {child}
      </div>
    );
  }

  private renderComparisonPlaceholder() {
    const { appConfig } = this.stores;
    const placeholderContent = Array.isArray(appConfig.comparisonPlaceholderContent)
                                ? appConfig.comparisonPlaceholderContent.map(str => <div key={str}>{str}</div>)
                                : appConfig.comparisonPlaceholderContent;
    return (
      <div
        className="comparison-placeholder"
        onDragOver={(this.handleDragOverSide)}
        onDrop={this.handleDropSide("comparison")}
        onClick={this.handleClick}
      >
        {placeholderContent}
      </div>
    );
  }

  private renderNavTabPanel() {
    const { teacherGuide,
            user: { isTeacher },
            ui: { activeNavTab,
                  navTabContentShown,
                  dividerPosition,
                }
          } = this.stores;
    const navTabSpecs = getNavTabConfigFromStores(this.stores);
    const studentTabs = navTabSpecs?.tabSpecs.filter((t) => !t.teacherOnly);
    const teacherTabs = navTabSpecs?.tabSpecs.filter(t => (t.tab !== "teacher-guide") || teacherGuide);
    const tabsToDisplay = isTeacher ? teacherTabs : studentTabs;

    return (
      <>
        <ResizePanelDivider
          isResourceExpanded={navTabContentShown}
          dividerPosition={dividerPosition}
          onExpandWorkspace={this.toggleExpandWorkspace}
          onExpandResources={this.toggleExpandResources}
        />
        <NavTabPanel
          tabs={tabsToDisplay}
          onDragOver={this.handleDragOverWorkspace}
          onDrop={this.handleImageDrop}
          isResourceExpanded={navTabContentShown}
        />
        <CollapsedResourcesTab
          onExpandResources={this.toggleExpandResources}
          resourceType={activeNavTab}
          isResourceExpanded={!navTabContentShown}
        />
      </>
    );
  }

  private isAcceptableImageDrag = (e: React.DragEvent<HTMLDivElement>) => {
    // make sure we have a primary document to drop onto
    return !!this.getPrimaryDocument(this.stores.ui.problemWorkspace.primaryDocumentKey);
  };

  private handleDragOverWorkspace = (e: React.DragEvent<HTMLDivElement>) => {
    this.imageDragDrop.dragOver(e);
  };

  private handleDragOverSide = (e: React.DragEvent<HTMLDivElement>) => {
    if (this.imageDragDrop.dragOver(e) || e.dataTransfer.types.find((type) => type === DocumentDragKey)) {
      e.preventDefault();
    }
  };

  private handleDropSide = (side: WorkspaceSide) => {
    return (e: React.DragEvent<HTMLDivElement>) => {
      const {ui, documents} = this.stores;
      const documentKey = e.dataTransfer && e.dataTransfer.getData(DocumentDragKey);
      if (documentKey) {
        const {problemWorkspace} = ui;
        const document = documents.getDocument(documentKey);
        if (document) {
          if ((side === "primary") && !document.isPublished) {
            problemWorkspace.setPrimaryDocument(document);
          }
          else {
            problemWorkspace.viewComparisonDocument(document);
          }
        }
      }
      else {
        // try to get the row it was dropped on
        let rowNode = e.target as HTMLElement | null;
        while (rowNode && (rowNode.className !== "tile-row")) {
          rowNode = rowNode.parentNode as HTMLElement | null;
        }
        const rowId = (rowNode && rowNode.dataset && rowNode.dataset.rowId) || undefined;
        this.handleImageDrop(e, rowId);
      }
    };
  };

  private handleImageDrop = (e: React.DragEvent<HTMLDivElement>, rowId?: string) => {
    const {ui} = this.stores;
    this.imageDragDrop.drop(e)
      .then((url) => {
        const primaryDocument = this.getPrimaryDocument(ui.problemWorkspace.primaryDocumentKey);
        if (primaryDocument?.content) {
          // insert the tile after the row it was dropped on otherwise add to end of document
          const rowIndex = rowId ? primaryDocument.content?.getRowIndex(rowId) : undefined;
          const rowInsertIndex = (rowIndex !== undefined ? rowIndex + 1 : primaryDocument.content?.rowOrder.length);
          primaryDocument.content.userAddTile("image", {
            url,
            insertRowInfo: {
              rowInsertIndex
            }
          });
        }
      })
      .catch((err) => {
        ui.alert(err.toString());
      });
  };

  private handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // placeholder
  };

  private handleNewDocument = (type: string) => {
    const { appConfig, documents, ui, user } = this.stores;
    const isLearningLog = type === LearningLogDocument;
    const docType = isLearningLog ? LearningLogDocument : PersonalDocument;
    const defaultDocTitle = isLearningLog
                            ? appConfig.defaultLearningLogTitle
                            : appConfig.defaultDocumentTitle;
    const docTypeString = appConfig.getDocumentLabel(docType, 1);
    const docTypeStringL = appConfig.getDocumentLabel(docType, 1, true);
    const nextTitle = documents.getNextOtherDocumentTitle(user, docType, defaultDocTitle);
    ui.prompt({
        className: `create-${type}`,
        title: `Create ${docTypeString}`,
        text: `Name your new ${docTypeStringL}:`,
        defaultValue: `${nextTitle}`,
      })
      .then((title: string) => {
        this.handleNewDocumentOpen(docType, title)
        .catch(error => ui.setError(error));
      });
  };

  private handleNewDocumentOpen = async (type: OtherDocumentType, title: string) => {
    const { appConfig, db, ui: { problemWorkspace } } = this.stores;
    const content = (type === PersonalDocument) && appConfig.defaultDocumentTemplate
                      ? appConfig.defaultDocumentContent : undefined;
    const newDocument = await db.createOtherDocument(type, {title, content});
    if (newDocument) {
      problemWorkspace.setPrimaryDocument(newDocument);
    }
  };

  private handleCopyDocument = (document: DocumentModelType) => {
    const { appConfig, ui } = this.stores;
    const docTypeString = document.getLabel(appConfig, 1);
    const docTypeStringL = document.getLabel(appConfig, 1, true);
    const originTitle = document?.properties?.get("originTitle");
    const baseTitle = appConfig.copyPreferOriginTitle && originTitle
                        ? originTitle
                        : document.title || this.stores.problem.title;
    ui.prompt(`Give your ${docTypeStringL} copy a new name:`,
              `Copy of ${baseTitle}`, `Copy ${docTypeString}`)
      .then((title: string) => {
        this.handleCopyDocumentOpen(document, title)
        .catch(error => ui.setError(error));
      });
  };

  private handleCopyDocumentOpen = async (document: DocumentModelType, title: string) => {
    const { db, ui: { problemWorkspace } } = this.stores;
    const copyDocument = await db.copyOtherDocument(document, { title, asTemplate: true });
    if (copyDocument) {
      problemWorkspace.setPrimaryDocument(copyDocument);
    }
  };

  private handleDeleteDocument = (document: DocumentModelType) => {
    const { appConfig } = this.stores;
    const docTypeString = document.getLabel(appConfig, 1);
    const docTypeStringL = document.getLabel(appConfig, 1, true);
    this.stores.ui.confirm(`Delete this ${docTypeStringL}? ${document.title}`, `Delete ${docTypeString}`)
    .then((confirmDelete: boolean) => {
      if (confirmDelete) {
        document.setProperty("isDeleted", "true");
        this.handleDeleteOpenPrimaryDocument();
      }
    });
  };

  private handleDeleteOpenPrimaryDocument = async () => {
    const { appConfig: { defaultDocumentType, defaultDocumentContent },
            db, ui: { problemWorkspace } } = this.stores;
    const defaultDocument = await db.guaranteeOpenDefaultDocument(defaultDocumentType, defaultDocumentContent);
    if (defaultDocument) {
      problemWorkspace.setPrimaryDocument(defaultDocument);
    }
  };

  private getProblemBaseTitle(title: string) {
    const match = /[\d.]*[\s]*(.+)/.exec(title);
    return match && match[1] ? match[1] : title;
  }

  private getSupportDocumentBaseCaption(document: DocumentModelType) {
    return document.type === ProblemDocument
            ? this.getProblemBaseTitle(this.stores.problem.title)
            : document.title;
  }

  private handlePublishSupport = (document: DocumentModelType) => {
    const { db, problemPath, ui, user } = this.stores;
    const caption = this.getSupportDocumentBaseCaption(document) || "Untitled";
    // TODO: Disable publish button while publishing
    db.publishDocumentAsSupport(document, caption)
      .then(() => {
        const classes = user.classHashesForProblemPath(problemPath);
        const classWord = classes.length === 1 ? "class" : "classes";
        ui.alert(`Your support was published to ${classes.length} ${classWord}.`, "Support Published");
      })
      .catch((reason) => ui.alert(`Your support failed to publish: ${reason}`, "Error"));
  };

  private handlePublishDocument = (document: DocumentModelType) => {
    const { appConfig, db, ui } = this.stores;
    const docTypeString = document.getLabel(appConfig, 1);
    const docTypeStringL = document.getLabel(appConfig, 1, true);
    ui.confirm(`Do you want to publish your ${docTypeStringL}?`, `Publish ${docTypeString}`)
      .then((confirm: boolean) => {
        if (confirm) {
          const dbPublishDocumentFunc = document.type === ProblemDocument
                                          ? () => db.publishProblemDocument(document)
                                          : () => db.publishOtherDocument(document);
          dbPublishDocumentFunc()
            .then(() => ui.alert(`Your ${docTypeStringL} was published.`, `${docTypeString} Published`))
            .catch((reason) => ui.alert(`Your document failed to publish: ${reason}`, "Error"));
        }
      });
  };

  private getPrimaryDocument(documentKey?: string) {
    if (documentKey) {
      return this.stores.documents.getDocument(documentKey);
    }
  }

  private toggleExpandWorkspace = () => {
    const { ui } = this.stores;
    if (ui.dividerPosition === kDividerMax) {
      ui.setDividerPosition(kDividerHalf);
    } else if (ui.dividerPosition === kDividerHalf) {
      ui.setDividerPosition(kDividerMin);
    }
  };

  private toggleExpandResources = () => {
    const { ui } = this.stores;
    if (ui.dividerPosition === kDividerMin) {
      ui.setDividerPosition(kDividerHalf);
    } else if (ui.dividerPosition === kDividerHalf) {
      ui.setDividerPosition(kDividerMax);
    }
  };
}
