import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ToolbarButtonModel } from "../models/tiles/toolbar-button";
import { ToolbarButtonComponent } from "./toolbar-button";

// This is needed so the icon for the text tool can be found
import "../register-tile-types";

describe("ToolButtonComponent", () => {

  const onSetToolActive = jest.fn();
  const onClick = jest.fn();
  const onDragStart = jest.fn();
  const onShowDropHighlight = jest.fn();
  const onHideDropHighlight = jest.fn();

  beforeEach(() => {
    onSetToolActive.mockReset();
    onClick.mockReset();
    onDragStart.mockReset();
    onShowDropHighlight.mockReset();
    onHideDropHighlight.mockReset();
  });

  it("renders disabled select tool", () => {
    const toolButton = ToolbarButtonModel.create({
      id: "select",
      title: "Select",
      iconId: "icon-select-tool",
      isDefault: true,
      isTileTool: false
    });

    render(
      <ToolbarButtonComponent
        toolButton={toolButton}
        isActive={false}
        isDisabled={true}
        onSetToolActive={onSetToolActive}
        onClick={onClick}
        onDragStart={onDragStart}
        onShowDropHighlight={onShowDropHighlight}
        onHideDropHighlight={onHideDropHighlight}
        />
    );
    expect(screen.getByTestId("tool-select")).toBeInTheDocument();
    act(() => {
      userEvent.click(screen.getByTestId("tool-select"));
    });
    expect(onSetToolActive).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders enabled text tool", () => {
    const toolButton = ToolbarButtonModel.create({
      id: "Text",
      title: "Text",
      isDefault: false,
      isTileTool: true
    });

    render(
      <ToolbarButtonComponent
        toolButton={toolButton}
        isActive={false}
        isDisabled={false}
        onSetToolActive={onSetToolActive}
        onClick={onClick}
        onDragStart={onDragStart}
        onShowDropHighlight={onShowDropHighlight}
        onHideDropHighlight={onHideDropHighlight}
        />
    );
    expect(screen.getByTestId("tool-text")).toBeInTheDocument();
    act(() => {
      userEvent.click(screen.getByTestId("tool-text"));
    });
    expect(onSetToolActive).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.dragStart(screen.getByTestId("tool-text"));
      fireEvent.dragEnd(screen.getByTestId("tool-text"));
    });
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });
});
