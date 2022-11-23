import { CustomEditor, DisplayDialogSettings, FieldType, IDialogController,
  IFieldValues, IModalDialogProps, ModalDialog } from "@concord-consortium/slate-editor";
import { clone } from "lodash";
import { useCallback, useMemo, useRef } from "react";
import { ReactEditor } from "slate-react";
//import { useCustomModal } from "../../../hooks/use-custom-modal";
import { useForceUpdate } from "../hooks/use-force-update";

interface IProps {
  editor?: any;
}

export const useTextToolDialog = ({editor}: IProps) => {
  const settingsRef = useRef<DisplayDialogSettings>();
  const validValuesRef = useRef<IFieldValues>();
  const forceUpdate = useForceUpdate();

  const setFieldValues = useCallback((newValues: IFieldValues) => {
    if (!settingsRef.current) return;
    settingsRef.current.values = { ...settingsRef.current.values, ...newValues };
    forceUpdate();
  }, [forceUpdate]);

  const validateFieldValues = () => {
    if (settingsRef.current) {
      validValuesRef.current = clone(settingsRef.current.values);
    }
  };

  const handleSetValue = (name: string, value: string, type: FieldType) => {
    setFieldValues({ [name]: value });
    if (type !== "input") {
      callOnChange(name, value);
    }
  };

  const handleChange = (name: string, value: string, type: FieldType) => {
    if (type === "input") {
      callOnChange(name, value);
    }
  };

  const callOnChange = (name: string, value: string) => {
    if (editor && settingsRef.current?.onChange) {
      const { values } = settingsRef.current;
      const isValid = settingsRef.current.onChange(editor, name, value, values) !== false;
      if (isValid) {
        validateFieldValues();
      }
      else {
        setFieldValues({ [name]: validValuesRef.current?.[name] || "" });
      }
    }
  };

  const handleClose = (values?: IFieldValues) => {
    hideDialog();
    editor && values && settingsRef.current?.onAccept?.(editor, values);
  };

  const dialogProps: IModalDialogProps = {
    title: settingsRef.current?.title || "",
    rows: settingsRef.current?.rows || [],
    fieldValues: settingsRef.current?.values || {},
    onSetValue: handleSetValue,
    onChange: handleChange,
    onValidate: settingsRef.current?.onValidate,
    onClose: handleClose,
  };

  // const [showDialog, hideDialog] = useCustomModal({
  //   title: settingsRef.current?.title || "",
  //   Content: ModalDialog,
  //   contentProps: dialogProps,
  //   buttons: []
  // }, [dialogProps]);
 // FIXME: A type in customModal is broken
  const showDialog = ()=> console.log('show dialog');
  const hideDialog = ()=> console.log('hide dialog');
  
  const dialogController: IDialogController = useMemo(() => ({
    display: (settings: DisplayDialogSettings) => {
      settingsRef.current = settings;
      validateFieldValues();
      // prevents focus-bouncing between editor and dialog
      ReactEditor.blur(editor);  //FIXME: Is CustomEditor what we want here instead?
      showDialog();
    },
    update: (newValues: IFieldValues) => {
      setFieldValues(newValues);
      validateFieldValues();
    }
  }), [editor, setFieldValues, showDialog]);

  return dialogController;
};
