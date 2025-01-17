import ClueCanvas from '../../../../support/elements/clue/cCanvas';
import DataflowToolTile from '../../../../support/elements/clue/DataflowToolTile';

let clueCanvas = new ClueCanvas;
let dataflowToolTile = new DataflowToolTile;
let dragXDestination = 300;

context('Dataflow Tool Tile', function () {
  before(function () {
    const queryParams = "?appMode=qa&fakeClass=5&fakeUser=student:5&qaGroup=5&unit=dfe&mouseSensor";
    cy.clearQAData('all');
    cy.visit(queryParams);
    cy.waitForLoad();
    cy.closeResourceTabs();
  });
  describe("Dataflow Tool", () => {
    it("renders dataflow tool tile", () => {
      clueCanvas.addTile("dataflow");
      dataflowToolTile.getDataflowTile().should("exist");
      dataflowToolTile.getTileTitle().should("exist");
    });
    it("edit tile title", () => {
      const newName = "Dataflow Tile";
      dataflowToolTile.getTileTitle().should("contain", "Program 1");
      dataflowToolTile.getDataflowTileTitle().click();
      dataflowToolTile.getDataflowTileTitle().type(newName + '{enter}');
      dataflowToolTile.getTileTitle().should("contain", newName);
    });
    describe("Number Node", () => {
      const nodeType = "number";
      it("can create number node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Number");
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

      //TODO: write a test that can check min and max (should be 0 and 3)
      // could be in class .chartjs-size-monitor

      it("can click zoom in positive button", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click(); //open minigraph
        dataflowToolTile.getShowZoomInButton(nodeType).click();
      });
      it("can click zoom out negative button", () => {
        dataflowToolTile.getShowZoomOutButton(nodeType).click();
        dataflowToolTile.getShowGraphButton(nodeType).click(); //close minigraph
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("not.exist");
        dataflowToolTile.getNodeOutput().should("exist");
      });
      it("verify zoom in & out", () => {
        dataflowToolTile.getZoomInButton().click();
        dataflowToolTile.getFlowtool().children().should("have.attr", "style").and("contain", "scale(1.05)");
        dataflowToolTile.getZoomOutButton().click();
        dataflowToolTile.getFlowtool().children().should("have.attr", "style").and("contain", "scale(1)");
      });
      it("can delete number node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Drag to Add Node", () => {
      const nodeType = "number";
      // TODO Why isn't this test working?
      it('can create node by dragging button onto tile', () => {
        const draggable = () => cy.get(".program-toolbar [aria-roledescription='draggable'] button").eq(1);
        dataflowToolTile.getNode(nodeType).should("not.exist");
        draggable().trigger("mousedown", { force: true })
          .wait(100)
          .trigger("mousemove", {
            force: true,
            clientX: 500,
            clientY: 200
          })
          .wait(100)
          .trigger("mouseup", { force: true })
          .wait(100);
        // const dataTransfer = new DataTransfer;
        // draggable().focus().trigger('dragstart', { dataTransfer });
        // dataflowToolTile.getDataflowTile().trigger('drop', { dataTransfer });
        // draggable().trigger('dragend');
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Generator Node", () => {
      const nodeType = "generator";
      it("can create generator node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Generator");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("can change the number", () => {
        dataflowToolTile.getAmplitudeField().clear();
        dataflowToolTile.getAmplitudeField().type("3{enter}");
        dataflowToolTile.getAmplitudeField().find('input').should("have.value", "3");
      });
      it("verify generator types", () => {
        const dropdown = "generatorType";
        const generatorTypes = ["Sine", "Square", "Triangle"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 3);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(generatorTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Triangle").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("not.exist");
        dataflowToolTile.getNodeOutput().should("exist");
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
        dataflowToolTile.getNodeTitle().should("contain", "Timer (on/off)");
      });
      it("timer node labels", () => {
        dataflowToolTile.getLabel("On").should('contain', "time on");
        dataflowToolTile.getLabel("Off").should('contain', "time off");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("not.exist");
        dataflowToolTile.getNodeOutput().should("exist");
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
        dataflowToolTile.getNodeTitle().should("contain", "Math");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify math operator types", () => {
        const dropdown = "mathOperator";
        const operatorTypes = ["Add", "Subtract", "Multiply", "Divide"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 4);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(operatorTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Divide").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 2);
        dataflowToolTile.getNodeOutput().should("exist");
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
        dataflowToolTile.getNodeTitle().should("contain", "Logic");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify logic operator types", () => {
        const dropdown = "logicOperator";
        const operatorTypes = ["Greater Than", "Less Than", "Greater Than Or Equal To", "Less Than Or Equal To", "Equal", "Not Equal", "And", "Or", "Nand", "Xor"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 10);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(operatorTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Xor").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 2);
        dataflowToolTile.getNodeOutput().should("exist");
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
        dataflowToolTile.getNodeTitle().should("contain", "Transform");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify logic operator types", () => {
        const dropdown = "transformOperator";
        const operatorTypes = ["Absolute Value", "Negation", "Not"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 3);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(operatorTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Not").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 1);
        dataflowToolTile.getNodeOutput().should("exist");
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
        dataflowToolTile.getNodeTitle().should("contain", "Demo Output");
      });
      it("can change output type", () => {
        const dropdown = "outputType";
        const outputTypes = ["Light Bulb", "Grabber", "Advanced Grabber", "Fan", "Humidifier"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 5);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(outputTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Humidifier").should("exist");
      });
      it("verify demo output images, node inputs outputs & toggle minigraph", () => {
        const dropdown = "outputType";
        //verify advanced grabber
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).eq(2).click();
        dataflowToolTile.getAdvancedGrabberImages();
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 2);
        dataflowToolTile.getNodeOutput().should("not.exist");

        dataflowToolTile.getShowGraphButton(nodeType).should('have.length', 2);
        dataflowToolTile.getShowGraphButton(nodeType).eq(0).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).eq(0).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
        dataflowToolTile.getShowGraphButton(nodeType).eq(1).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).eq(1).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");

        dataflowToolTile.getOutputNodeValueText().should("contain", "0% closed");
        dataflowToolTile.getOutputTiltValueText().should("contain", "tilt: center");

        // verify grabber
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).eq(1).click();
        dataflowToolTile.getGrabberImage();
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 1);
        dataflowToolTile.getNodeOutput().should("not.exist");

        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");

        dataflowToolTile.getOutputNodeValueText().should("contain", "0% closed");

        // verify light bulb
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).first().click();
        dataflowToolTile.getLightBulbImage();
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 1);
        dataflowToolTile.getNodeOutput().should("not.exist");

        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");

        dataflowToolTile.getOutputNodeValueText().should("contain", "off");
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
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Live Output");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify live output types", () => {
        const dropdown = "liveOutputType";
        const outputTypes = ["Light Bulb", "Grabber", "Humidifier", "Fan", "Heat Lamp"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 5);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(outputTypes[index]);
        });
        dataflowToolTile.getOutputNodeValueText().should("contain", "off");
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Heat Lamp").should("exist");
        dataflowToolTile.getOutputNodeValueText().should("contain", "off");
      });
      it("verify live binary outputs indicate hub not present if not connected", () => {
        const dropdown = "liveOutputType";
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).eq(3).click();
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Fan").should("exist");
        dataflowToolTile.getOutputNodeValueText().should("contain", "(no hub)");
      });
      it("can be dragged to the right and set back to light bulb", () => {
        const dropdown = "liveOutputType";
        dataflowToolTile.getNode(nodeType).click(50, 10)
          .trigger("pointerdown", 50, 10 )
          .trigger("pointermove", dragXDestination, 10, { force: true } )
          .trigger("pointerup", dragXDestination, 10, { force: true } );
          dataflowToolTile.getDropdown(nodeType, dropdown).click();
          dataflowToolTile.getDropdownOptions(nodeType, dropdown).eq(0).click();
      });
      it("can connect and trigger modal connection warning", () => {
        dataflowToolTile.getCreateNodeButton("number").click();
        dataflowToolTile.getNode("number").should("exist");
        dataflowToolTile.getNumberField().type("1{enter}");
        dataflowToolTile.getNumberNodeOutput().should("exist");
        dataflowToolTile.getDataflowTile().click(306, 182)
          .trigger("pointerdown", 306, 182, {force: true})
          .trigger("pointermove", 366, 172, {force: true})
          .trigger("pointerup", 366, 172, {force: true});
        dataflowToolTile.getModalOkButton().click();
      });
      it("can recieve a value from a connected block, and display correct on or off string", () => {
        dataflowToolTile.getNode("number").should("exist");
        dataflowToolTile.getOutputNodeValueText().should("contain", "on");
        dataflowToolTile.getNumberField().type("{backspace}0{enter}");
        dataflowToolTile.getNumberNodeOutput().should("exist");
        dataflowToolTile.getOutputNodeValueText().should("contain", "off");
        dataflowToolTile.getDeleteNodeButton("number").click();
      });
      it("verify live output options", () => {
        dataflowToolTile.getDropdown(nodeType, "hubSelect").should("exist");
        dataflowToolTile.getDropdown(nodeType, "hubSelect").should("contain", "micro:bit hub a");
        dataflowToolTile.getDropdown(nodeType, "hubSelect").get(".disabled").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 1);
        dataflowToolTile.getNodeOutput().should("not.exist");
      });
      it("can delete live output node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Control Node", () => {
      const nodeType = "control";
      it("can create control node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Control");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify control operator types", () => {
        const dropdown = "controlOperator";
        const operatorTypes = ["Hold Current", "Hold Prior", "Output Zero"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 3);
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(operatorTypes[index]);
        });
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).last().click();
        dataflowToolTile.getDropdownOptions(nodeType, dropdown).should("have.length", 0);
        dataflowToolTile.getDropdown(nodeType, dropdown).contains("Output Zero").should("exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getNodeInput().should("exist");
        dataflowToolTile.getNodeInput().should('have.length', 2);
        dataflowToolTile.getNodeOutput().should("exist");
      });
      it("can delete control node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Sensor Node", () => {
      const nodeType = "sensor";
      it("can create sensor node", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Sensor");
      });
      it("can toggle minigraph", () => {
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("exist");
        dataflowToolTile.getShowGraphButton(nodeType).click();
        dataflowToolTile.getMinigraph(nodeType).should("not.exist");
      });
      it("verify sensor types", () => {
        const dropdown = "sensor-type";
        const sensorTypes = ["Temperature", "Humidity", "CO₂", "O₂", "Light", "Soil Moisture", "Particulates", "EMG", "Surface Pressure"];
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getSensorDropdownOptions(nodeType).should("have.length", 9);
        dataflowToolTile.getSensorDropdownOptions(nodeType).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(sensorTypes[index]);
        });
      });
      it("verify clear button", () => {
        dataflowToolTile.getClearButton().click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
      it("verify sensor select", () => {
        const dropdown = "sensor-select";
        const sensorSelect = [
          "Temperature Demo Data", "Humidity Demo Data", "CO2 Demo Data", "O2 Demo Data", "Light Demo Data", "Particulates Demo Data",
         "EMG - Varied Clenches Demo Data", "EMG - Long Clench and Hold Demo Data", "EMG - Short Clench and Hold Demo Data", "FSR Demo Data",
         "⚠️ connect arduino for emg",
         "⚠️ connect arduino for fsr",
         "⚠️ connect microbit for temperature-microbit-a",
         "⚠️ connect microbit for humidity-microbit-a",
         "⚠️ connect microbit for temperature-microbit-b",
         "⚠️ connect microbit for humidity-microbit-b",
         "⚠️ connect microbit for temperature-microbit-c",
         "⚠️ connect microbit for humidity-microbit-c",
         "⚠️ connect microbit for temperature-microbit-d",
         "⚠️ connect microbit for humidity-microbit-d",
        ];
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getDropdown(nodeType, dropdown).click();
        dataflowToolTile.getSensorDropdownOptions(nodeType).should("have.length", 20);
        dataflowToolTile.getSensorDropdownOptions(nodeType).each(($tab, index, $typeList) => {
          expect($tab.text()).to.contain(sensorSelect[index]);
        });
        dataflowToolTile.getClearButton().click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
      it("verify node inputs outputs", () => {
        dataflowToolTile.getCreateNodeButton(nodeType).click();
        dataflowToolTile.getNodeInput().should("not.exist");
        dataflowToolTile.getNodeOutput().should("exist");
      });
      it("can delete sensor node", () => {
        dataflowToolTile.getDeleteNodeButton(nodeType).click();
        dataflowToolTile.getNode(nodeType).should("not.exist");
      });
    });
    describe("Record Data", () => {
      it("can create a small program", () => {
        const nodes = [ "timer", "demo-output" ];
        dataflowToolTile.getCreateNodeButton(nodes[0]).click();
        dataflowToolTile.getNode(nodes[0]).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Timer (on/off)");
        dataflowToolTile.getCreateNodeButton(nodes[1]).click();
        dataflowToolTile.getNode(nodes[1]).should("exist");
        dataflowToolTile.getNodeTitle().should("contain", "Demo Output");
        dataflowToolTile.getNodeOutput().eq(0).click();
        dataflowToolTile.getNodeInput().eq(0).click();
      });
      it("verify sampling rate", () => {
        const rate = "500";
        dataflowToolTile.getSamplingRateLabel().should("have.text", "Sampling Rate");
        dataflowToolTile.selectSamplingRate(rate);
      });
      it("verify recording and stop recording", () => {
        dataflowToolTile.verifyRecordButtonText();
        dataflowToolTile.verifyRecordButtonIcon();
        dataflowToolTile.getRecordButton().click();

        dataflowToolTile.verifyPlayButtonText();
        dataflowToolTile.verifyPlayButtonIcon();
        dataflowToolTile.getPlayButton().should("be.disabled");
        dataflowToolTile.verifyStopButtonText();
        dataflowToolTile.verifyStopButtonIcon();

        dataflowToolTile.getTimeSlider().should("be.visible");
        dataflowToolTile.getCountdownTimer().should("contain", "/");
        cy.wait(5000);

        dataflowToolTile.getStopButton().click();
      });
      it("verify play and pause recording", () => {
        dataflowToolTile.getPlayButton().should("be.enabled");
        dataflowToolTile.verifyRecordingClearButtonText();
        dataflowToolTile.verifyRecordingClearButtonIcon();
        dataflowToolTile.getPlayButton().click();

        dataflowToolTile.verifyPauseButtonText();
        dataflowToolTile.verifyPauseButtonIcon();
        dataflowToolTile.getPauseButton().should("be.enabled");
        dataflowToolTile.getPauseButton().click();

        dataflowToolTile.getPlayButton().should("be.enabled");
        dataflowToolTile.getPlayButton().click();
        cy.wait(5000);
      });
      it("verify clear recording", () => {
        dataflowToolTile.verifyRecordingClearButtonText();
        dataflowToolTile.verifyRecordingClearButtonIcon();
        dataflowToolTile.getRecordingClearButton().click();
        dataflowToolTile.getClearDataWarningTitle().should("have.text", "Clear Data");
        dataflowToolTile.getClearDataWarningContent().should(
          "contain",
          "Remove the program's recorded data and any linked displays of this data? This action is not undoable.");
        dataflowToolTile.getClearDataWarningCancel().click();
        dataflowToolTile.verifyRecordingClearButtonText();
        dataflowToolTile.verifyRecordingClearButtonIcon();
        dataflowToolTile.getRecordingClearButton().click();
        dataflowToolTile.getClearDataWarningClear().click();
        dataflowToolTile.getSamplingRateLabel().should("have.text", "Sampling Rate");
        dataflowToolTile.verifyRecordButtonText();
        dataflowToolTile.verifyRecordButtonIcon();
      });
    });
  });
});
