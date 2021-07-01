import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import React from "react";
import { ModalProvider } from "react-modal-hook";
import { DocumentModel } from "../models/document/document";
import { DocumentContentModel } from "../models/document/document-content";
import { createStores } from "../models/stores/stores";
import { ToolbarComponent, ToolbarConfig } from "./toolbar";

describe("ToolbarComponent", () => {

  const stores = createStores();
  const content = DocumentContentModel.create({});
  const document = DocumentModel.create({
                    uid: "1",
                    type: "problem",
                    key: "1",
                    createdAt: 0,
                    content: content as any
                  });

  const config: ToolbarConfig = [
    {
      name: "select",
      title: "Select",
      iconId: "icon-select-tool",
      isDefault: true,
      isTileTool: false
    },
    {
      name: "text",
      title: "Text",
      iconId: "icon-text-tool",
      isDefault: false,
      isTileTool: true
    },
    {
      name: "delete",
      title: "Delete",
      iconId: "icon-delete-tool",
      isDefault: false,
      isTileTool: false
    }
  ];

  it("renders successfully", () => {
    render(
      <ModalProvider>
        <Provider stores={stores}>
          <ToolbarComponent config={config} document={document}/>
        </Provider>
      </ModalProvider>
    );
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();

    act(() => {
      userEvent.click(screen.getByTestId("tool-select"));
      userEvent.click(screen.getByTestId("tool-text"));
      userEvent.click(screen.getByTestId("delete-button"));
    });

    // act(() => {
    //   fireEvent.dragStart(screen.getByTestId("tool-text"), new DragEvent('dragstart'));
    //   fireEvent.dragEnd(screen.getByTestId("tool-text"), new DragEvent('dragend'));
    // });
  });

});