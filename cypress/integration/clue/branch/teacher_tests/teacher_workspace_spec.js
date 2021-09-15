import TeacherDashboard from "../../../../support/elements/clue/TeacherDashboard";
import ClueCanvas from "../../../../support/elements/clue/cCanvas";
import Canvas from "../../../../support/elements/common/Canvas";
import TableToolTile from "../../../../support/elements/clue/TableToolTile";
import DrawToolTile from "../../../../support/elements/clue/DrawToolTile";

let dashboard = new TeacherDashboard();
let clueCanvas = new ClueCanvas;
let canvas = new Canvas;
let tableToolTile = new TableToolTile;
let drawToolTile = new DrawToolTile;

let teacherDoc = "Teacher Investigation Copy";
const queryParams = "/?appMode=qa&fakeClass=5&fakeOffering=5&problem=2.1&fakeUser=teacher:7&unit=msa";

before(() => {
  cy.clearQAData('all');

  cy.visit(queryParams);
  cy.waitForSpinner();
  dashboard.switchView("Workspace & Resources");
  cy.wait(2000);
  clueCanvas.getInvestigationCanvasTitle().text().as('investigationTitle');
});
beforeEach(() => {
  cy.fixture("teacher-dash-data-msa-test.json").as("clueData");
});

describe('teacher specific navigation tabs', () => {
  it('verify problem tab solution switch', () => {
    cy.get('.collapsed-resources-tab').click();
    cy.wait(500);
    cy.get('.top-tab.tab-problems').should('exist').click();
    cy.get('.prob-tab').contains('What If...?').click();
    cy.get('[data-test=solutions-button]').should('have.class', "toggled");
    cy.get('.has-teacher-tiles').should("exist");
    cy.get('[data-test=solutions-button]').click();
    cy.get('[data-test=solutions-button]').should('have.not.class', "toggled");
    cy.get('.has-teacher-tiles').should("not.exist");
  });

  it('verify teacher guide', () => {
    cy.get('.top-tab.tab-teacher-guide').should('exist').click({force:true});
    cy.get('.prob-tab.teacher-guide').should('exist').and('have.length', 4).each(function (subTab, index, subTabList) {
      const teacherGuideSubTabs = ["Overview", "Launch", "Explore", "Summarize"];
      cy.wrap(subTab).text().should('contain', teacherGuideSubTabs[index]);
    });
  });
});

describe.skip('teacher document functionality', function () {
  before(function () {
    clueCanvas.addTile('table');
    clueCanvas.addTile('drawing');
    canvas.copyDocument(teacherDoc);
    cy.wait(2000);
    cy.openTopTab("my-work");
    cy.openDocumentWithTitle('my-work', 'workspaces', teacherDoc);
    clueCanvas.addTile('table');
  });
  it('verify save and restore investigation', function () {
    cy.openSection("my-work", "workspaces");
    cy.getCanvasItemTitle("workspaces").contains(this.investigationTitle).should('exist');
    cy.openDocumentWithTitle("my-work", "workspaces", this.investigationTitle);
    cy.wait(2000);
    tableToolTile.getTableTile().should('exist');
    drawToolTile.getDrawTile().should('exist');
  });
  it('verify save and restore extra workspace', function () {
    cy.openTopTab("my-work");
    cy.openSection("my-work", "workspaces");
    cy.getCanvasItemTitle("workspaces").contains(teacherDoc).should('exist');
    cy.openDocumentWithTitle("my-work", "workspaces", teacherDoc);
    cy.wait(2000);
    tableToolTile.getTableTile().should('exist');
    drawToolTile.getDrawTile().should('exist');
  });
  after(function () { //Clean up teacher document and copy
    canvas.deleteDocument();
    cy.openTopTab("my-work");
    cy.openSection('my-work', 'workspaces');
    cy.openDocumentWithTitle("my-work", "workspaces", this.investigationTitle);
    clueCanvas.deleteTile('draw');
    clueCanvas.deleteTile('table');
  });
});

describe('Chat panel for networked teacher', () => {
  it('verify chat does not appear when no url params are passed to indicate teacher status (teachers are in network', () => {
    cy.get('.chat-panel-toggle').should('not.exist');
  });
  it('verify chat panel is accessible is teacher is in network (via url params)', () => {
    cy.visit("/?appMode=qa&fakeClass=5&fakeOffering=5&problem=2.1&fakeUser=teacher:7&unit=msa&chat&network=foo");
    cy.waitForSpinner();
    dashboard.switchView("Workspace & Resources");
    cy.wait(2000);
    cy.get('.collapsed-resources-tab').click();
    cy.openTopTab("problems");
    cy.get('.chat-panel-toggle').should('exist');
  });
  it('verify chat panel opens', () => {
    cy.get('.chat-panel-toggle').click();
    cy.get('.chat-panel').should('exist');
    cy.get('.notification-toggle').should('exist');
    cy.get('.chat-close-button').should('exist').click();
    cy.get('.chat-panel-toggle').should('exist');
    cy.get('.chat-panel').should('not.exist');
  });
  it('verify new comment card is visible, and Post button is disabled', () => {
    cy.get('.chat-panel-toggle').click();
    cy.get('[data-testid=comment-card]').should('be.visible');
    cy.get('[data-testid=comment-post-button]').should('have.class', 'disabled');
  });
  it('verify user can cancel a comment', () => {
    const documentComment = "This comment is for the document.";
    cy.get('[data-testid=comment-textarea]').click().type(documentComment);
    cy.get('[data-testid=comment-textarea]').should('contain', documentComment);
    cy.get('[data-testid=comment-cancel-button]').scrollIntoView().click();
    cy.get('[data-testid=comment-textarea]').should('not.contain', documentComment);
  });
  it('verify user can post a comment', () => {
    const documentComment = "An alert should show this document comment.";
    cy.get('[data-testid=comment-textarea]').click().type(documentComment);
    cy.get('[data-testid=comment-textarea]').should('contain', documentComment);
    cy.get('[data-testid=comment-post-button]').click();
    cy.wait(5000);
    cy.get('[data-testid=comment-thread] [data-testid=comment]').should('contain', documentComment);
  });
  it('verify teacher name and initial appear on comment correctly', () => {
    cy.get('[data-testid=teacher-initial]').should('contain', "T");
    cy.get('.comment-text-header .user-name').should('contain', "Teacher 7");
  });
  it("verify problem document is hightlighted", () => {
    cy.get('.problem-panel .document-content').should('have.class', 'comment-select');
  });
  it('verify workspace tab document is highlighted', () => {
    clueCanvas.getInvestigationCanvasTitle().text().then((title)=>{
      cy.openTopTab('my-work');
      cy.openSection('my-work', 'workspaces');
      cy.openDocumentThumbnail('workspaces', title);
      cy.get('.documents-panel .editable-document-content').should('have.class','comment-select');
    });
  });
  it("verify escape key empties textarea", () => {
    cy.get("[data-testid=comment-textarea]").type("this should be erased. {esc}");
    cy.get("[data-testid=comment-textarea]").should("contain", "");
    cy.get(".comment-text").should("not.exist");
  });
  it('verify user can use shift+enter to go to the next line and not post', () => {
    cy.get("[data-testid=comment-textarea]").type("this is the first line. {shift}{enter}");
    cy.get(".comment-text").should("not.exist");
    cy.get("[data-testid=comment-textarea]").type("this is the second line.");
    cy.get("[data-testid=comment-post-button]").click();
    cy.get(".comment-text").should("have.length", 1);
    cy.get(".comment-text").should("contain", "this is the first line.\nthis is the second line.");
  });
  it('verify user can use enter send post', () => {
    cy.get("[data-testid=comment-textarea]").type("Send this comment after enter.{enter}");
    cy.wait(1000);
    cy.get(".comment-text").should("have.length", 2);
    cy.get(".comment-text").last().should("contain", "Send this comment after enter.");
  });
});

describe.skip('Student Workspace', () => { //flaky -- could be because it is trying to connect to firebase?
  it('verify student workspace tab', () => {
    cy.visit("/?appMode=demo&demoName=CLUE-Test&fakeClass=5&fakeOffering=5&problem=2.1&fakeUser=teacher:7&unit=msa");
    cy.waitForSpinner();
    dashboard.switchView("Workspace & Resources");
    cy.wait(2000);
    cy.get('@clueData').then((clueData) => {
      const groups = clueData.classes[0].problems[0].groups;
      cy.get('.top-tab.tab-student-work').should('exist').click({force:true});
      cy.get('.top-tab-buttons').should('have.class', 'hidden');
      cy.get('.student-group-view').should('be.visible');
      cy.get('.student-group .group-number').should('be.visible').and('have.length', groups.length);
      cy.get('.student-group .group-number').eq(0).should('have.class', 'active');
      cy.get('.group-title').should('contain', 'Group 1');
      cy.get('.canvas-area .four-up .member').should('have.length', 4);
      cy.get('.canvas-area .four-up .member').eq(0).should('contain', 'S1');
      cy.get('.student-group .group-number').contains('G3').click();
      cy.get('.student-group .group-number').eq(2).should('have.class', 'active');
      cy.get('.group-title').should('contain', 'Group 3');
      cy.get('.canvas-area .four-up .member').eq(0).should('contain', 'S9');
    });
  });
});


describe.skip('teacher document functionality', function () {
  before(function () {
    clueCanvas.addTile('table');
    clueCanvas.addTile('drawing');
    canvas.copyDocument(teacherDoc);
    cy.wait(2000);
    cy.openResourcesTab();
    cy.openTopTab("my-work");
    cy.openDocumentWithTitle('my-work', 'workspaces', teacherDoc);
    clueCanvas.addTile('table');
  });
  it('verify save and restore investigation', function () {
    cy.openSection("my-work", "workspaces");
    cy.getCanvasItemTitle("workspaces").contains(this.investigationTitle).should('exist');
    cy.openDocumentWithTitle("my-work", "workspaces", this.investigationTitle);
    cy.wait(2000);
    tableToolTile.getTableTile().should('exist');
    drawToolTile.getDrawTile().should('exist');
  });
  it('verify save and restore extra workspace', function () {
    cy.openTopTab("my-work");
    cy.openSection("my-work", "workspaces");
    cy.getCanvasItemTitle("workspaces").contains(teacherDoc).should('exist');
    cy.openDocumentWithTitle("my-work", "workspaces", teacherDoc);
    cy.wait(2000);
    tableToolTile.getTableTile().should('exist');
    drawToolTile.getDrawTile().should('exist');
  });
  after(function () {
    clueCanvas.deleteTile('table');
    clueCanvas.deleteTile('draw');
    cy.openTopTab("my-work");
    cy.openSection('my-work', 'workspaces');
    cy.openDocumentWithTitle("my-work", "workspaces", this.investigationTitle);
    clueCanvas.deleteTile('draw');
    clueCanvas.deleteTile('table');
  });
});
