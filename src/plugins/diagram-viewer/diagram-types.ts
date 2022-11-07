export const kDiagramTileType = "Diagram";

// The version shown to the user for the Diagram tile.
// Currently it is just the version of the diagram-view library.
// TODO: include a version in the diagram-view library so we can reference that
// instead
export const kQPVersion = "0.0.14";

// This is a version stored in the state of the tile
// Currently any state with a different version will be ignored.
// In the future we can hopefully support migrating older state
export const kDiagramToolStateVersion = "0.0.3";

export const kDiagramDefaultWidth = 480;
export const kDiagramDefaultHeight = 320;
