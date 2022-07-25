import ClueCanvas from '../../../../support/elements/clue/cCanvas';
import DataflowToolTile from '../../../../support/elements/clue/DataflowToolTile';

let clueCanvas = new ClueCanvas,
  dataflowToolTile = new DataflowToolTile;

context('Dataflow Tool Tile', function () {
  before(function () {
    const queryParams = "?appMode=qa&fakeClass=5&fakeUser=student:5&qaGroup=5&unit=dfe";
    cy.clearQAData('all');

    cy.visit(queryParams);
    cy.waitForLoad();
  });
  describe("Dataflow Tool", () => {
    it("renders dataflow tool tile", () => {
      clueCanvas.addTile("dataflow");
      dataflowToolTile.getDrawTile().should("exist");
    });
    describe("Number Node", () => {
      const nodeType = "number";
      it("can create number node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("can change the number", () => {
        dataflowToolTile.getNumberField().type("3{enter}");
        dataflowToolTile.getNumberField().should("have.value", "3");
      });
      it("can delete number node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Generator Node", () => {
      const nodeType = "generator";
      it("can create generator node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can delete generator node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Timer Node", () => {
      const nodeType = "timer";
      it("can create timer node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can delete timer node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Math Node", () => {
      const nodeType = "math";
      it("can create math node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can delete math node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Logic Node", () => {
      const nodeType = "logic";
      it("can create logic node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can delete logic node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Transform Node", () => {
      const nodeType = "transform";
      it("can create transform node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can delete transform node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Demo Output Node", () => {
      const nodeType = "demo-output";
      it("can create demo output node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
      });
      it("can change output type", () => {
        const dropdown = "outputType";
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 3);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Grabber").should("exist");
      });
      it("can delete demo output node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Live Output Node", () => {
      const nodeType = "live-output";
      it("can create live output node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        cy.get("#okButton").click(); // on first creation, modal notifies user of need to connect device
        dataflowToolTile.getNode(nodeType).should("exist");
      });
    });
  });
});
