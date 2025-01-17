// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
import '@testing-library/cypress/add-commands';
import ClueHeader from './elements/clue/cHeader';
import PrimaryWorkspace from './elements/common/PrimaryWorkspace';
import Canvas from './elements/common/Canvas';
import TeacherDashboard from "./elements/clue/TeacherDashboard";
import 'cypress-file-upload';
import 'cypress-commands';
import ResourcesPanel from "./elements/clue/ResourcesPanel";
import ClueCanvas from './elements/clue/cCanvas';

const clueCanvas = new ClueCanvas;

Cypress.Commands.add("setupGroup", (students, group) => {
    let qaClass = 10,
        problem = 2.3;

    let header = new ClueHeader;
    let i=0, j=0;

    for (i=0;i<students.length;i++) {
        cy.visit('?appMode=qa&qaGroup='+group+'&fakeClass='+qaClass+'&fakeUser=student:'+students[i]+'&problem='+problem);
        // These checks are here to make sure the workspace has loaded enough to create
        // the student
        cy.waitForLoad();
        header.getGroupName().should('contain','Group '+group);
        header.getGroupMembers().find('div.member').should('contain','S'+students[i]);
        clueCanvas.shareCanvas();
    }
    // Verify Group num and the correct 4 students are listed, now that all 4 are loaded
    header.getGroupName().should('contain','Group '+group);
    for (j=0; j<students.length; j++) {
        header.getGroupMembers().find('div.member').should('contain','S'+students[j]);
    }
});

Cypress.Commands.add("uploadFile",(selector, filename, type="")=>{
    // cy.fixture(filename).as("image");

    return cy.get(selector).then(subject => {
        return cy.fixture(filename,'base64')
            .then(str => Promise.resolve(Cypress.Blob.base64StringToBlob))
        // From Cypress document: https://docs.cypress.io/api/utilities/blob.html#Examples
        // return Cypress.Blob.base64StringToBlob(cy.fixture(filename), "image/png")
            .then((blob) => {
            const el = subject[0];
            const nameSegments = filename.split('/');
            const name = nameSegments[nameSegments.length - 1];
            const testFile = new File([blob], name, { type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(testFile);
            el.files = dataTransfer.files;
            return subject;
        });
    });
});
Cypress.Commands.add("clearQAData", (data)=>{ //clears data from Firebase (currently data='all' is the only one supported)
    if (data==='all') {

        cy.visit('?appMode=qa&qaClear=' + data + '&fakeClass=5&fakeUser=student:5');
        // For some reason when using
        //   cy.get('span', {timeout: 60000}).should('contain','QA Cleared: OK');
        // If there is a test failure then a weird
        // error is shown:
        //   object tested must be an array, a map, an object, a set, a string,
        //   or a weakset, but undefined given
        // The log shows the assertion passing and then shows it failing right after
        // using contains fixes this problem.
        cy.contains('span', 'QA Cleared: OK', {timeout: 60000});
    }
});

// Login using cy.request, this is faster than using visit, and it makes it possible
// to visit a local domain after logging in
Cypress.Commands.add("login", (baseUrl, testTeacher) => {
    /*
      Cookies should be cleared automatically, but that doesn't seem to happen
      with cy.request to other domains.
      The use of {domain: null} is an undocumented feature that I found here:
      https://github.com/cypress-io/cypress/issues/408
      Without this, the tests will typically pass, but if you leave your cypress browser
      open long enough, then an invalid cookie will be sent when the test is run and
      the login will fail in a strange way. It returns success, but doesn't set a valid
      cookie.
    */
    cy.clearCookies({domain: null});

    cy.request({
        url: `${baseUrl}/api/v1/users/sign_in`,
        method: "POST",
        body: {
          "user[login]": testTeacher.username,
          "user[password]": testTeacher.password
        },
        form: true
    })
    .its("status").should("equal", 200);
});

// Launch a local report, this uses cy.request to first launch the portal report
// this returns a redirect to a released version of CLUE
// the URL is modified to strip off the domain and path
// this way the same url parameters are passed to the localhost CLUE server
// The portal was not visited with cy.visit, so cypress will allow us to visit a different
// second level domain (localhost)
Cypress.Commands.add("launchReport", (reportUrl) => {
    cy.request({
        url: reportUrl,
        method: "GET",
        followRedirect: false
    })
    .then((resp) => {
        expect(resp.status).to.eq(302);
        expect(resp.redirectedToUrl).to.match(/^https:\/\/collaborative-learning\.concord\.org/);
        const realReportUrl = resp.redirectedToUrl;
        const localReportUrl = new URL(realReportUrl).search;
        // cy.visit resolves urls relative to the baseUrl
        cy.visit(localReportUrl);
    });
});
Cypress.Commands.add("waitForLoad", () => {
  cy.get('.version', {timeout: 60000});
});
Cypress.Commands.add("deleteWorkspaces",(baseUrl,queryParams)=>{
    let primaryWorkspace = new PrimaryWorkspace;
    let resourcesPanel = new ResourcesPanel;
    let canvas = new Canvas;
    let dashboard = new TeacherDashboard();

    cy.visit(baseUrl+queryParams);
    cy.waitForLoad();
    dashboard.switchView("Workspace & Resources");
    cy.wait(2000);
    resourcesPanel.openPrimaryWorkspaceTab("my-work");
    cy.openSection("my-work","workspaces");
    cy.wait(2000);
    primaryWorkspace.getAllSectionCanvasItems("my-work","workspaces").then((document_list)=>{
        let listLength = document_list.length;
        while(listLength>1){
            primaryWorkspace.getAllSectionCanvasItems("my-work","workspaces").eq(0).click();
            cy.wait(1111);
            canvas.deleteDocument();
            listLength=listLength-1;
            resourcesPanel.openPrimaryWorkspaceTab("my-work");
        }

    });
});
Cypress.Commands.add("openResourceTabs", () => {
  cy.get('.collapsed-resources-tab').click();
} );
Cypress.Commands.add("openTopTab", (tab) => {
  cy.get('.top-tab.tab-'+tab).click();
} );
Cypress.Commands.add("openProblemSection", (section) => {//doc-tab my-work workspaces problem-documents selected
  cy.get('.prob-tab').contains(section).click({force:true});
});
Cypress.Commands.add("openSection", (tab, section) => {//doc-tab my-work workspaces problem-documents selected
  cy.get('.doc-tab.'+tab+'.'+section).click({force:true});
});
Cypress.Commands.add("getCanvasItemTitle", (section) => {
  cy.get('.list.'+section+' [data-test='+section+'-list-items] .footer');
});
Cypress.Commands.add("openDocumentThumbnail", (section,title) => { //opens thumbnail into the nav panel
  cy.get('.list.'+section+' [data-test='+section+'-list-items] .footer').contains(title).parent().parent().siblings('.scaled-list-item-container').click({force:true});
});
Cypress.Commands.add("openDocumentWithTitle", (tab, section, title) => {
  cy.openSection(tab,section);
  cy.get('.list.'+section+' [data-test='+section+'-list-items] .footer').contains(title).parent().parent().siblings('.scaled-list-item-container').click({force:true});
  cy.get('.edit-button').click();
});
Cypress.Commands.add("openDocumentWithIndex", (tab, section, docIndex) => {
  cy.openSection(tab,section);
  cy.get('.list.'+section+' [data-test='+section+'-list-items] .footer').eq(docIndex).siblings('.scaled-list-item-container').click({force:true});
  cy.get('.edit-button').click();
});
Cypress.Commands.add("clickProblemResourceTile", (subsection, tileIndex = 0) => {
  cy.get('[data-focus-section='+subsection+'] .problem-panel .document-content .tile-row').eq(tileIndex).click();
});
Cypress.Commands.add("getToolTile", (tileIndex = 0) => {
  cy.get('.problem-panel .document-content .tile-row .tool-tile').eq(tileIndex);
});
Cypress.Commands.add("clickDocumentResourceTile", (tileIndex = 0) => {
  cy.get('.documents-panel .editable-document-content .tile-row').eq(tileIndex).click();
});
Cypress.Commands.add("getDocumentToolTile", (tileIndex = 0) => {
  cy.get('.documents-panel .editable-document-content .tile-row tool-tile').eq(tileIndex).click();
});
Cypress.Commands.add('closeResourceTabs', () => {
  cy.get('.nav-tab-panel .close-button').click();
});
Cypress.Commands.add('collapseWorkspace', () => {
  cy.get('.divider').click({force:true});
  cy.get('.divider-container .expand-handle.right').click();
  // cy.get('.divider-container .expand-handle.right').click(); // to ensure workspace is collapsed regardless of initial position
});
Cypress.Commands.add('linkTableToGraph', (table, graph) => {
  cy.get('.primary-workspace .table-title').contains(table).within(() => {
    cy.get('.link-tile-button').click();
  });
  cy.get('.ReactModalPortal').within(() => {
    cy.get('[data-test=link-graph-select]').select(graph);
    cy.get('button').contains('Link').click();
  });
});
Cypress.Commands.add('unlinkTableToGraph', (table, graph) => {
  cy.get('.primary-workspace .table-title').contains(table).within(() => {
    cy.get('.link-tile-button').click();
  });
  cy.get('.ReactModalPortal').within(() => {
    cy.get('[data-test=link-graph-select]').select(graph);
    cy.get('button').contains('Unlink').click();
  });
});
Cypress.Commands.add('linkTableToDataflow', (program, table) => {
  cy.get('.primary-workspace .title-area').contains(program).parent().parent().within(() => {
    cy.get('.link-table-button').click();
  });
  cy.get('.ReactModalPortal').within(() => {
    cy.get('[data-test=link-table-select]').select(table);
    cy.get('button').contains('Link').click();
  });
});
Cypress.Commands.add('unlinkTableToDataflow', (program, table) => {
  cy.get('.primary-workspace .title-area').contains(program).parent().parent().within(() => {
    cy.get('.link-table-button').click();
  });
  cy.get('.ReactModalPortal').within(() => {
    cy.get('[data-test=link-table-select]').select(table);
    cy.get('button').contains('Unlink').click();
  });
});
Cypress.Commands.add("deleteDocumentThumbnail", (tab, section,title) => { 
  cy.get('.'+tab+' .list.'+section+' [data-test='+section+'-list-items] .footer .icon-delete-document').eq(1).click({force:true});
});
