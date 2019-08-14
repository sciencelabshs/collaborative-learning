import { inject, observer } from "mobx-react";
import * as React from "react";

import { BaseComponent, IBaseProps } from "../base";
import { CollapsibleSectionHeader } from "./collapsible-section-header";
import { DocumentDragKey, ProblemDocument, DocumentModelType, PersonalDocument } from "../../models/document/document";
import { NavTabSectionSpec, ENavTabSectionType } from "../../models/view/right-nav";
import { ThumbnailDocumentItem } from "./thumbnail-document-item";

interface IProps extends IBaseProps {
  scale: number;
}

interface IState {
  showPersonalDocuments: boolean;
  showProblemDocuments: boolean;
}

// will be pulled from unit eventually
const kMyWorkSections: NavTabSectionSpec[] = [
  {
    title: "Workspaces I've Created",
    type: ENavTabSectionType.kPersonalDocuments
  },
  {
    title: "%abbrevInvestigation%",
    type: ENavTabSectionType.kProblemDocuments
  }
];

@inject("stores")
@observer
export class MyWorkComponent extends BaseComponent<IProps, IState> {

  public state = {
    showPersonalDocuments: false,
    showProblemDocuments: false
  };

  public render() {
    return (
      <div className="my-work">
        <div className="header">My Work</div>

        {this.renderSectionContents(kMyWorkSections)}
      </div>
    );
  }

  private getSectionTitle(sectionSpec: NavTabSectionSpec) {
    if (sectionSpec.title === "%abbrevInvestigation%") {
      const { unit, problem } = this.stores;
      const { abbrevTitle } = unit;
      const prefix = abbrevTitle ? `${abbrevTitle}: ` : "";
      // For now pull investigation number from problem title.
      // Teacher dashboard work adds investigation to store, at which
      // point it can be pulled from there directly.
      const problemChar0 = problem.title.length ? problem.title[0] : "";
      const investigationNum = problemChar0 >= "0" && problemChar0 <= "9" ? problemChar0 : "";
      return `${prefix}Investigation ${investigationNum}`;
    }
    return sectionSpec.title;
  }

  private renderSectionContents(sectionSpecs: NavTabSectionSpec[]) {
    return sectionSpecs.map(sectionSpec => {
      switch (sectionSpec.type) {
        case ENavTabSectionType.kPersonalDocuments:
          return this.renderPersonalDocumentsSection(sectionSpec);
        case ENavTabSectionType.kProblemDocuments:
          return this.renderProblemDocumentsSection(sectionSpec);
      }
    });
  }

  private renderPersonalDocumentsSection(sectionSpec: NavTabSectionSpec) {
    const sectionTitle = this.getSectionTitle(sectionSpec);
    const isExpanded = this.state.showPersonalDocuments;
    const { documents, user } = this.stores;
    const userDocs = documents.byTypeForUser(PersonalDocument, user.id);
    return (
      <>
        <CollapsibleSectionHeader
          sectionTitle={sectionTitle} dataTestName="my-work-section"
          isExpanded={isExpanded} onClick={this.handlePersonalSectionHeaderClick}/>

        <div className={"list " + (isExpanded ? "shown" : "hidden")}>
          {userDocs.map((document, index) => {
            return (
              <ThumbnailDocumentItem
                key={document.key} dataTestName="my-work-list-items"
                canvasContext="my-work" document={document} scale={this.props.scale}
                captionText={`Untitled-${index + 1}`}
                onDocumentClick={this.handleDocumentClick} onDocumentDragStart={this.handleDocumentDragStart} />
            );
          })}
        </div>
      </>
    );
  }

  private renderProblemDocumentsSection(sectionSpec: NavTabSectionSpec) {
    const sectionTitle = this.getSectionTitle(sectionSpec);
    const isExpanded = this.state.showProblemDocuments;
    const { documents, problem, user } = this.stores;
    const userDocs = documents.byTypeForUser(ProblemDocument, user.id);
    return (
      <>
        <CollapsibleSectionHeader
          sectionTitle={sectionTitle} dataTestName="my-work-section"
          isExpanded={isExpanded} onClick={this.handleProblemSectionHeaderClick}/>

        <div className={"list " + (isExpanded ? "shown" : "hidden")}>
          {userDocs.map(document => {
            return (
              <ThumbnailDocumentItem
                key={document.key} dataTestName="my-work-list-items"
                canvasContext="my-work" document={document} scale={this.props.scale}
                captionText={problem.title}
                onDocumentClick={this.handleDocumentClick} onDocumentDragStart={this.handleDocumentDragStart} />
            );
          })}
        </div>
      </>
    );
  }

  private handlePersonalSectionHeaderClick = () => {
    this.setState(state => ({ showPersonalDocuments: !state.showPersonalDocuments }));
  }

  private handleProblemSectionHeaderClick = () => {
    this.setState(state => ({ showProblemDocuments: !state.showProblemDocuments }));
  }

  private handleDocumentClick = (document: DocumentModelType) => {
    const {ui} = this.stores;
    const {problemWorkspace, learningLogWorkspace} = ui;
    if (ui.bottomNavExpanded) {
      if (learningLogWorkspace.primaryDocumentKey) {
        learningLogWorkspace.setComparisonDocument(document);
        learningLogWorkspace.toggleComparisonVisible({override: true});
      }
      else {
        ui.alert("Please select a Learning Log first.", "Select for Learning Log");
      }
    }
    else {
      problemWorkspace.setAvailableDocument(document);
      ui.contractAll();
    }
  }

  private handleDocumentDragStart = (e: React.DragEvent<HTMLDivElement>, document: DocumentModelType) => {
    e.dataTransfer.setData(DocumentDragKey, document.key);
  }
}
