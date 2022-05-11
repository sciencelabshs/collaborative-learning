import { HtmlSerializablePlugin } from "@concord-consortium/slate-editor";
import { FunctionComponent, SVGProps } from "react";
import { SharedModelType } from "../shared-model";
import { TextContentModelType } from "./text-content";

export interface ITextPluginInfo {
  iconName: string;
  Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  toolTip: string;
  createSlatePlugin: 
    (textContent: TextContentModelType) => HtmlSerializablePlugin;
  command: string;
  updateTextContentAfterSharedModelChanges?: 
    (textContent: TextContentModelType, sharedModel?: SharedModelType) => void;
}

const gTextPluginInfoMap: Record<string, ITextPluginInfo | undefined> = {};

export function registerTextPluginInfo(textToolInfo: ITextPluginInfo) {
  gTextPluginInfoMap[textToolInfo.iconName] = textToolInfo;
}

export function getTextPluginInfo(id: string) {
  return gTextPluginInfoMap[id];
}

// TODO: perhaps this should only add the plugins that have been configured
// as tools by the app-config. 
export function getTextPluginInstances(textContent: TextContentModelType) {
  const pluginInstances:  HtmlSerializablePlugin[] = [];
  Object.values(gTextPluginInfoMap).forEach(pluginInfo => {
    if (pluginInfo?.createSlatePlugin) {
      pluginInstances.push(pluginInfo.createSlatePlugin(textContent));
    }
  });
  return pluginInstances;
}

export function getTextPluginIds() {
  return Object.keys(gTextPluginInfoMap);
}

export function getAllTextPluginInfos() {
  return Object.values(gTextPluginInfoMap);
}
