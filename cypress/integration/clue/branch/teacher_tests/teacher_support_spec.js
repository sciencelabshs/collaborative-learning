import TeacherDashboard from "../../../../support/elements/clue/TeacherDashboard";
// import PrimaryWorkspace from "../../../../support/elements/common/PrimaryWorkspace";
import ClueCanvas from "../../../../support/elements/clue/cCanvas";
import ResourcesPanel from "../../../../support/elements/clue/ResourcesPanel";

    let dashboard = new TeacherDashboard();
    // let primaryWorkspace = new PrimaryWorkspace();
    let resourcesPanel = new ResourcesPanel();
    let clueCanvas = new ClueCanvas;

    const title = "Drawing Wumps";

    before(function() {
        const queryParams = `${Cypress.config("teacherQueryParams")}`;
        cy.clearQAData('all');

        cy.visit(queryParams);
        cy.waitForLoad();
        dashboard.switchView("Workspace & Resources");
        cy.wait(2000);
    });

    describe('verify supports functionality', function() {
        it('will verify publish of support appears in Support>Teacher Workspace',function(){
            clueCanvas.addTile('table');
            clueCanvas.publishSupportDoc();
            cy.get(".collapsed-resources-tab.my-work").click();
            cy.openTopTab("supports");
            cy.openSection('supports','teacher-supports');
            resourcesPanel.getCanvasItemTitle('supports','teacher-supports').should('contain',title);
        });
    });

    describe("test visibility of teacher supports in student's workspace", function() {
            it('verify teacher support is visible in student nav', function() {
              const queryParams = `${Cypress.config("queryParams")}`;

              cy.visit(queryParams);
              cy.waitForLoad();
              cy.openResourceTabs();
              cy.openTopTab("supports");
              cy.get('.support-badge').should('be.visible');
              cy.openSection('supports', 'teacher-supports');
              cy.getCanvasItemTitle('teacher-supports', title).should('be.visible');
            });
    });

after(function(){
        const queryParams = `${Cypress.config("teacherQueryParams")}`;

        cy.visit(queryParams);
        cy.waitForLoad();
        cy.clearQAData('all');
});
