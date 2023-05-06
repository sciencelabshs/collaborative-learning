import { observer } from "mobx-react";
import React, { BaseSyntheticEvent, DOMAttributes, useRef } from "react";
import { ITileProps } from "../../components/tiles/tile-component";
import { ExpressionContentModelType } from "./expression-content";
import { MathfieldElementAttributes, MathfieldElement } from "mathlive";
import { CustomEditableTileTitle } from "../../components/tiles/custom-editable-tile-title";
import('mathlive');

import "./expression-tile.scss";

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
  namespace JSX { // eslint-disable-line @typescript-eslint/no-namespace
    interface IntrinsicElements {
      ["math-field"]: CustomElement<MathfieldElementAttributes>;
    }
  }
}

export const ExpressionToolComponent: React.FC<ITileProps> = observer((props) => {
  const content = props.model.content as ExpressionContentModelType;
  const mathfieldRef = useRef<MathfieldElement>(null);

  const handleChange = (e: any) => {
    content.setLatexStr(e.target.value);
  };

  return (
    <div className="expression-tool">
      <div className="expression-title-area">
        <CustomEditableTileTitle
          model={props.model}
          onRequestUniqueTitle={props.onRequestUniqueTitle}
          readOnly={props.readOnly}
        />
      </div>
      <div className="expression-math-area">
        <math-field
          ref={mathfieldRef}
          value={content.latexStr}
          onInput={(e:BaseSyntheticEvent) => handleChange(e)}
        />
      </div>
    </div>
  );
});
ExpressionToolComponent.displayName = "ExpressionToolComponent";
