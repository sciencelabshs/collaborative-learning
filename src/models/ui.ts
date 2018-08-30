import { types } from "mobx-state-tree";

type ToggleElement = "learningLogExpanded" | "leftNavExpanded" | "myWorkExpanded";

export const UIModel = types
  .model("UI", {
    learningLogExpanded: false,
    leftNavExpanded: false,
    myWorkExpanded: false,
  })
  .views((self) => ({
    get allContracted() {
      return !self.learningLogExpanded && !self.leftNavExpanded && !self.myWorkExpanded;
    },
  }))
  .actions((self) => {
    const contractAll = () => {
      self.learningLogExpanded = false;
      self.leftNavExpanded = false;
      self.myWorkExpanded = false;
    };

    const toggleWithOverride = (toggle: ToggleElement, override?: boolean) => {
      const expanded = typeof override !== "undefined" ? override : !self[toggle];

      // for mobx we can't set self[toggle] as it doesn't trigger the update
      // so we set everything to false and then only expand a single toggle if needed
      contractAll();

      if (expanded) {
        switch (toggle) {
          case "learningLogExpanded":
            self.learningLogExpanded = true;
            break;
          case "leftNavExpanded":
            self.leftNavExpanded = true;
            break;
          case "myWorkExpanded":
            self.myWorkExpanded = true;
            break;
        }
      }
    };

    return {
      contractAll,
      toggleLeftNav(override?: boolean) {
        toggleWithOverride("leftNavExpanded", override);
      },
      toggleLearningLog(override?: boolean) {
        toggleWithOverride("learningLogExpanded", override);
      },
      toggleMyWork(override?: boolean) {
        toggleWithOverride("myWorkExpanded", override);
      },
    };
  });

export type UIModelType = typeof UIModel.Type;