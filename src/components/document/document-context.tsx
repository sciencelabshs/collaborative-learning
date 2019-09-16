import * as React from "react";
import { ISetProperties } from "../../models/document/document";

export interface IDocumentContext {
  getProperty: (key: string) => string | undefined;
  setProperties: (properties: ISetProperties) => void;
}

export const DocumentContext = React.createContext<IDocumentContext | undefined>(undefined);

/*
 * Example of use
 *
import { DocumentContext } from "../../../components/document/document-context";

export class GeometryContentComponent extends BaseComponent<{}, {}> {

  public static contextType = DocumentContext;

  public context!: React.ContextType<typeof DocumentContext>;

  public componentDidUpdate() {
    this.context && this.context.setProperties({ foo: "bar", baz: "roo" });
  }
}
*/