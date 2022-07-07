import { DiagramMigrator } from "./diagram-migrator";
import { kDiagramToolStateVersion } from "./diagram-types";

describe("DiagramMigrator", () => {
  const basicDiagram = {
    root: {
      nodes: {
        "node1": {
          x: 1,
          y: 1,
          variable: "variable1"
        }
      }
    },
  };

  it("loads modern state", () => {
    const migrated = DiagramMigrator.create({
      version: kDiagramToolStateVersion,
      ...basicDiagram
    });
    expect(migrated.root?.nodes.size).toBe(1);
  });

  it("blanks out state without a version", () => {
    jestSpyConsole("warn", mockConsole => {
      const migrated = DiagramMigrator.create(basicDiagram);
      expect(mockConsole).toHaveBeenCalled();
      expect(migrated.root?.nodes.size).toBe(0);
    });
  });

  it("blanks out state with old version", () => {
    jestSpyConsole("warn", mockConsole => {
      const migrated = DiagramMigrator.create({
        version: "0.0.2",
        ...basicDiagram
      });
      expect(mockConsole).toHaveBeenCalled();
      expect(migrated.root?.nodes.size).toBe(0);
    });
  });

  it("blanks out any kind of state without a version", () => {
    jestSpyConsole("warn", mockConsole => {
      const migrated = DiagramMigrator.create({foo: "bar"});
      expect(mockConsole).toHaveBeenCalled();
      expect(migrated.root?.nodes.size).toBe(0);
    });
  });

});
