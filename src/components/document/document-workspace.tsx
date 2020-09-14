import { inject, observer } from "mobx-react";
import { getSnapshot } from "mobx-state-tree";
import React from "react";
import { DocumentComponent, WorkspaceSide } from "../../components/document/document";
import { GroupVirtualDocumentComponent } from "../../components/document/group-virtual-document";
import { BaseComponent, IBaseProps } from "../../components/base";
import { DocumentDragKey, DocumentModelType, LearningLogDocument, OtherDocumentType,
         PersonalDocument, ProblemDocument } from "../../models/document/document";
import { DocumentContentModel } from "../../models/document/document-content";
import { ImageDragDrop } from "../utilities/image-drag-drop";
import { NavTabPanel } from "../navigation/nav-tab-panel";
import { NavTabButtons } from "../navigation/nav-tab-buttons";

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
    const { appConfig : { navTabs: { tabSpecs } }, user } = this.stores;
    const studentTabs = tabSpecs.filter((t) => !t.teacherOnly);
    const isTeacher = user.isTeacher;
    const tabsToDisplay = isTeacher ? tabSpecs : studentTabs;
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
        {this.renderDocuments()}
        <NavTabPanel
          tabs={tabsToDisplay}
          isTeacher={isTeacher}
          onDragOver={this.handleDragOverWorkspace}
          onDrop={this.handleImageDrop}
        />
        <NavTabButtons
          tabs={tabsToDisplay}
          isTeacher={isTeacher}
          onDragOver={this.handleDragOverWorkspace}
          onDrop={this.handleImageDrop}
        />
      </div>
    );
  }

  private getDefaultDocumentContent() {
    const { appConfig: { autoSectionProblemDocuments, defaultDocumentType, defaultDocumentContent },
            problem } = this.stores;
    if ((defaultDocumentType === ProblemDocument) && autoSectionProblemDocuments) {
      const tiles: any = [];
      problem.sections.forEach(section => {
        tiles.push({ content: { isSectionHeader: true, sectionId: section.type }});
        tiles.push({ content: { type: "Placeholder", sectionId: section.type }});
      });
      return DocumentContentModel.create({ tiles } as any);
    }
    else if (defaultDocumentContent) {
      return defaultDocumentContent;
    }
  }

  private async guaranteeInitialDocuments() {
    const { appConfig: { defaultDocumentType, defaultLearningLogDocument,
                        defaultLearningLogTitle, initialLearningLogTitle },
            db, ui: { problemWorkspace } } = this.stores;
    if (!problemWorkspace.primaryDocumentKey) {
      const documentContent = this.getDefaultDocumentContent();
      const defaultDocument = await db.guaranteeOpenDefaultDocument(defaultDocumentType, documentContent);
      if (defaultDocument) {
        problemWorkspace.setPrimaryDocument(defaultDocument);
      }
    }
    // Guarantee the user starts with one learning log
    defaultLearningLogDocument && await db.guaranteeLearningLog(initialLearningLogTitle || defaultLearningLogTitle);
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

    const toolbar = appConfig && getSnapshot(appConfig.toolbar);

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

    // Show Pimary and comparison docs:
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
    const { ui } = this.stores;
    const style = { right: 0 };
    const positionedClassName = ui.navTabContentShown ? className + " half" : className;
    const roleClassName = side === "primary" ? "primary-workspace" : "reference-workspace";
    return (
      <div
        className={`${positionedClassName} ${roleClassName}`}
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

  private isAcceptableImageDrag = (e: React.DragEvent<HTMLDivElement>) => {
    // make sure we have a primary document to drop onto
    return !!this.getPrimaryDocument(this.stores.ui.problemWorkspace.primaryDocumentKey);
  }

  private handleDragOverWorkspace = (e: React.DragEvent<HTMLDivElement>) => {
    this.imageDragDrop.dragOver(e);
  }

  private handleDragOverSide = (e: React.DragEvent<HTMLDivElement>) => {
    if (this.imageDragDrop.dragOver(e) || e.dataTransfer.types.find((type) => type === DocumentDragKey)) {
      e.preventDefault();
    }
  }

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
  }

  private handleImageDrop = (e: React.DragEvent<HTMLDivElement>, rowId?: string) => {
    const {ui} = this.stores;
    this.imageDragDrop.drop(e)
      .then((url) => {
        const primaryDocument = this.getPrimaryDocument(ui.problemWorkspace.primaryDocumentKey);
        if (primaryDocument) {
          // insert the tile after the row it was dropped on otherwise add to end of document
          const rowIndex = rowId ? primaryDocument.content.getRowIndex(rowId) : undefined;
          const rowInsertIndex = (rowIndex !== undefined ? rowIndex + 1 : primaryDocument.content.rowOrder.length);
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
  }

  private handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // placeholder
  }

  private handleNewDocument = (type: string) => {
    const { appConfig, user } = this.stores;
    const isLearningLog = type === LearningLogDocument;
    const docType = isLearningLog ? LearningLogDocument : PersonalDocument;
    const defaultDocTitle = isLearningLog
                            ? appConfig.defaultLearningLogTitle
                            : appConfig.defaultDocumentTitle;
    const docTypeString = appConfig.getDocumentLabel(docType, 1);
    const docTypeStringL = appConfig.getDocumentLabel(docType, 1, true);
    const nextTitle = this.stores.documents.getNextOtherDocumentTitle(user, docType, defaultDocTitle);
    this.stores.ui.prompt(`Name your new ${docTypeStringL}:`, `${nextTitle}`, `Create ${docTypeString}`)
      .then((title: string) => {
        this.handleNewDocumentOpen(docType, title)
        .catch(this.stores.ui.setError);
      });
  }

  private handleNewDocumentOpen = async (type: OtherDocumentType, title: string) => {
    const { appConfig, db, ui: { problemWorkspace } } = this.stores;
    const content = (type === PersonalDocument) && appConfig.defaultDocumentTemplate
                      ? appConfig.defaultDocumentContent : undefined;
    const newDocument = await db.createOtherDocument(type, {title, content});
    if (newDocument) {
      problemWorkspace.setPrimaryDocument(newDocument);
    }
  }

  private handleCopyDocument = (document: DocumentModelType) => {
    const { appConfig } = this.stores;
    const docTypeString = document.getLabel(appConfig, 1);
    const docTypeStringL = document.getLabel(appConfig, 1, true);
    const originTitle = document?.properties?.get("originTitle");
    const baseTitle = appConfig.copyPreferOriginTitle && originTitle
                        ? originTitle
                        : document.title || this.stores.problem.title;
    this.stores.ui.prompt(`Give your ${docTypeStringL} copy a new name:`,
                          `Copy of ${baseTitle}`, `Copy ${docTypeString}`)
      .then((title: string) => {
        this.handleCopyDocumentOpen(document, title)
        .catch(this.stores.ui.setError);
      });
  }

  private handleCopyDocumentOpen = async (document: DocumentModelType, title: string) => {
    const { db, ui: { problemWorkspace } } = this.stores;
    const copyDocument = await db.copyOtherDocument(document, { title, asTemplate: true });
    if (copyDocument) {
      problemWorkspace.setPrimaryDocument(copyDocument);
    }
  }

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
  }

  private handleDeleteOpenPrimaryDocument = async () => {
    const { appConfig: { defaultDocumentType, defaultDocumentContent },
            db, ui: { problemWorkspace } } = this.stores;
    const defaultDocument = await db.guaranteeOpenDefaultDocument(defaultDocumentType, defaultDocumentContent);
    if (defaultDocument) {
      problemWorkspace.setPrimaryDocument(defaultDocument);
    }
  }

  private getProblemBaseTitle(title: string) {
    const match = /[\d.]*[\s]*(.+)/.exec(title);
    return match && match[1] ? match[1] : title;
  }

  private getSupportDocumentBaseCaption(document: DocumentModelType) {
    return document.type === ProblemDocument
            ? this.getProblemBaseTitle(this.stores.problem.title)
            : document.title;
  }

  private handlePublishSupport = async (document: DocumentModelType) => {
    const { db, ui } = this.stores;
    const caption = this.getSupportDocumentBaseCaption(document) || "Untitled";
    // TODO: Disable publish button while publishing
    db.publishDocumentAsSupport(document, caption)
      .then(() => ui.alert("Your support was published.", "Support Published"))
      .catch((reason) => ui.alert(`Your support failed to publish: ${reason}`, "Error"));
  }

  private handlePublishDocument = (document: DocumentModelType) => {
    const { appConfig, db, ui } = this.stores;
    const docTypeString = document.getLabel(appConfig, 1);
    const docTypeStringL = document.getLabel(appConfig, 1, true);
    ui.confirm(`Do you want to publish your ${docTypeStringL}?`, `Publish ${docTypeString}`)
      .then((confirm: boolean) => {
        if (confirm) {
          const dbPublishDocumentFunc = document.type === ProblemDocument
                                          ? db.publishProblemDocument
                                          : db.publishOtherDocument;
          dbPublishDocumentFunc.call(db, document)
            .then(() => ui.alert(`Your ${docTypeStringL} was published.`, `${docTypeString} Published`));
        }
      });
  }

  private getPrimaryDocument(documentKey?: string) {
    if (documentKey) {
      return this.stores.documents.getDocument(documentKey);
    }
  }
}
