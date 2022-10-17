import { observer } from "mobx-react";
import { useEffect } from "react";
import { usePrevious } from "../../hooks/use-previous";
import { useUIStore } from "../../hooks/use-stores";

/*
 * FocusDocumentTracker
 *
 * This component is basically a hook wrapped in a functional component so that
 * it can be called from a class component (NavTabPanel in this case). It's basic
 * purpose is to walk the DOM to figure out what user document or curriculum section
 * is currently visible in the left-side navigation panel for the purpose of deciding
 * what document or curriculum section can be commented upon in the comments panel.
 * We had been trying to determine this by tracking clicks in the various tab headers
 * but this was getting increasingly complicated and wasn't working very well. This
 * ties the behavior of the comments panel to what's actually visible to the user, as
 * it should be. The mechanism is that components that are responsible for presenting
 * documents or curriculum sections to the user add a `data-focus-document` or
 * `data-focus-section` attribute which can then be detected when we crawl the
 * DOM thus guaranteeing that we're finding the top-most visible documents/sections.
 */
interface IProps {
  navTabPanelElt: HTMLDivElement | null;
}
export const FocusDocumentTracker = observer(({ navTabPanelElt }: IProps) => {
  // console.log("<FocusDocumentTracker with navTabPanelElt\n", navTabPanelElt);
  const ui = useUIStore();
  const prevUpdates = usePrevious(ui.focusDocUpdates);
  const prevTab = usePrevious(navTabPanelElt);

  // console.log("focus-document-tracker.tsx > prevUpdates:\n", prevUpdates, "\n prevTab \n", prevTab);


  useEffect(() => {
    if (navTabPanelElt && ((prevTab !== navTabPanelElt) || (ui.focusDocUpdates !== prevUpdates))) {
      // set a timer to allow rendering to complete
      setTimeout(() => {
        let focusDocument: string | undefined;
        let focusSection: string | undefined;

        // find elements at a point below the rows of tab headers
        const bounds = navTabPanelElt.getBoundingClientRect();
        const kHeaderHeight = 34;
        const kMaxHeadersHeight = 3 * kHeaderHeight;
        const kOffset = 10;
        const testLeft = bounds.left + kOffset;
        const testTop = bounds.top + kMaxHeadersHeight + kOffset;
        const elements = document.elementsFromPoint(testLeft, testTop);

        // loop through elements looking for data attributes
        // note that although it's not mentioned on MDN or other documentation sites,
        // the spec makes clear that the elements are returned in front-to-back order.
        for (let i = 0; !focusDocument && (i < elements.length); ++i) {
          const elt = elements[i];
          const focusDoc = elt.getAttribute("data-focus-document");
          const focusSec = elt.getAttribute("data-focus-section");
          focusDoc && (focusDocument = focusDoc);
          focusSec && (focusSection = focusSec);
          // console.log("line 59, focusSection", focusSection);

        }

        //this gets called again which sets it back to first section tab
        // console.log("focus-document-tracker.tsx > useEffect() > ui.setFocusDocument() \n focusSection\n",
        // focusSection, "\nfocusDocument\n", focusDocument);

        // if flag is up
        //! isDocumentViewMode
        ui.setFocusDocument(focusSection
                              ? `${focusDocument}/${focusSection}`
                              : focusDocument);

      }, 30);
    }
  }, [navTabPanelElt, prevTab, prevUpdates, ui, ui.focusDocUpdates]);
  return null;
});
