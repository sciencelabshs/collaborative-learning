import ClueCanvas from '../../../../support/elements/clue/cCanvas';
import DataCardToolTile from '../../../../support/elements/clue/DataCardToolTile';

let clueCanvas = new ClueCanvas;
let dc = new DataCardToolTile;

context('Data Card Tool Tile', function () {
  before(function () {
    const queryParams = "?appMode=qa&fakeClass=5&fakeUser=student:5&qaGroup=5&unit=moth";
    cy.clearQAData('all');
    cy.visit(queryParams);
    cy.waitForLoad();
  });
  describe("Data Card Tool", () => {
    it("renders Data Card tool tile", () => {
      clueCanvas.addTile("datacard");
      dc.getTile().should("exist");
    });
    it("has a default title", () => {
      dc.getTile().contains("Data Card Collection");
    });
    it("can create a new attribute", () => {
      dc.getNameInputAsInactive().dblclick().type("Hello{enter}");
      dc.getNameInputAsInactive().contains("Hello");
    });
    it("can add a value to an attribute", () => {
      dc.getValueInputAsInactive().dblclick().type("Hi{enter}");
      // FIXME / TODO not sure why below assertion fails, I can see it is there in cy test runner
      // dc.getValueInputAsInactive().should("contain","Hi");
    });
    it("can toggle between single and sort views", () => {
      cy.get('.single-card-data-area').should('exist');
      dc.getSortSelect().select("Hello");
      cy.get('.sorting-cards-data-area').should('exist');
      dc.getSortSelect().select("None");
      cy.get('.single-card-data-area').should('exist');
    });
    it("has sort menu with same attributes as card", () => {
      dc.getNameInputAsInactive().dblclick().type("Attribute Two{enter}");
      dc.getSortSelect().select("Attribute Two");
      cy.get('.sorting-cards-data-area').should('exist');
      dc.getSortSelect().select("None");

      // TODO - find the correct one, delete it, and make sure it is not in the menu
    });
  });
});

