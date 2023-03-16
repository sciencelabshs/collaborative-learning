import React from "react";
import { ITileModel } from "../../../models/tiles/tile-model";
import { DataCardContentModelType } from "../data-card-content";
import { orderBy } from "lodash";

interface IProps {
  model: ITileModel;
  onSortAttrChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  attrIdNamePairs: any[];
}

// TODO - refactor this so that it gets currentSortId and attrsWithNames
// as props - then it will update on time and prevent ability to choose
// an attribute that no longer exists

export const SortSelect: React.FC<IProps> = ({ model, attrIdNamePairs, onSortAttrChange }) => {
  const content = model.content as DataCardContentModelType;
  const alphaAttrs = orderBy(attrIdNamePairs, [attr => attr.attrName.toLowerCase()]);

  return (
    <div className="sort-select">
      <label>
        Sort
        <select
          className="sort-select-input"
          name="selectedSortAttribute"
          onChange={onSortAttrChange}
          value={content.selectedSortAttributeId}
        >
          <option value="">None</option>
          { alphaAttrs.map((a) => {
            return <option key={a.attrId} value={a.attrId}>{a.attrName}</option>;
          })}
        </select>
      </label>
    </div>
  );
};