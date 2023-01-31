import { useState, useCallback } from "react";
import { useCustomModal } from "../../../hooks/use-custom-modal";
import { EditVariableDialogContent, Variable, VariableType } from "@concord-consortium/diagram-view";

import AddVariableChipIcon from "../assets/add-variable-chip-icon.svg";
import './variable-dialog.scss';
import { SharedVariablesType } from "../shared-variables";

interface IUseNewVariableDialog {
  addVariable: (variable: VariableType ) => void;
  sharedModel?: SharedVariablesType;
  namePrefill? : string
}
export const useNewVariableDialog = ({ addVariable, sharedModel, namePrefill }: IUseNewVariableDialog) => {
  const [newVariable, setNewVariable] = useState(Variable.create({name: namePrefill || undefined}));

  const handleClick = () => {
    sharedModel?.addVariable(newVariable);
    const sharedVariable = sharedModel?.variables.find(v => v === newVariable);
    if (sharedVariable) {
      addVariable(sharedVariable);
    }
    setNewVariable(Variable.create({name: namePrefill || undefined}));
  };

  const [show, hideModal] = useCustomModal({
    Icon: AddVariableChipIcon,
    title: "New Variable",
    Content: EditVariableDialogContent,
    contentProps: { variable: newVariable },
    buttons: [
      { label: "Cancel" },
      { label: "OK",
        isDefault: true,
        isDisabled: false,
        onClick: handleClick
      }
    ]
  }, [addVariable, newVariable]);

  // Wrap useCustomModal's show so we can prefill with variable name
  const showModal = useCallback(() => {
    if (namePrefill) {
      newVariable.setName(namePrefill);
    }
    show();
  }, [namePrefill, newVariable]);

  return [showModal, hideModal];
};
