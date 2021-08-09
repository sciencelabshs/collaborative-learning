import TeacherDashboard from "../../../../support/elements/clue/TeacherDashboard";
import RightNav from "../../../../support/elements/common/RightNav";
import ClueCanvas from "../../../../support/elements/clue/cCanvas";

    let dashboard = new TeacherDashboard();
    let rightNav = new RightNav();
    let clueCanvas = new ClueCanvas;

    const title = "Drawing Wumps";

    before(function() {
        const queryParams = `${Cypress.config("teacherQueryParams")}`;
        cy.clearQAData('all');

        cy.visit(queryParams);
        cy.waitForSpinner();
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
            rightNav.getCanvasItemTitle('supports','teacher-supports').should('contain',title);
        });
    });

    describe("test visibility of teacher supports in student's workspace", function() {
            it.skip('verify badge on Support Tab',function(){ //this test isn't needed anymore?
                // const queryParams = `${Cypress.config("queryParams")}`;

                // cy.visit(queryParams);
                // cy.waitForSpinner();
                // cy.get(".collapsed-resources-tab.my-work").click();
                // clueRightNav.getSupportBadge().should('be.visible');
            });
            it('verify teacher support is visible in student nav', function() {
              const queryParams = `${Cypress.config("queryParams")}`;

              cy.visit(queryParams);
              cy.waitForSpinner();
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
        cy.waitForSpinner();
        cy.clearQAData('all');
});
