import { types, Instance, getSnapshot } from "mobx-state-tree";
import { cloneDeep } from "lodash";
import { InvestigationModelType } from "../curriculum/investigation";
import { ProblemModelType } from "../curriculum/problem";
import { getSectionAbbrev, getSectionTitle, SectionType } from "../curriculum/section";
import { ESupportType, SupportModel, SupportModelType } from "../curriculum/support";
import { UnitModelType } from "../curriculum/unit";
import { DB } from "../../lib/db";
import { IDocumentProperties } from "../../lib/db-types";
import { Logger, LogEventName } from "../../lib/logger";
import { DocumentContentModel, DocumentContentSnapshotType, IAuthoredDocumentContent } from "../document/document-content";
import { DocumentModel, SupportPublication } from "../document/document";
import { DocumentsModelType } from "./documents";
import { safeJsonParse } from "../../utilities/js-utils";

export enum AudienceEnum {
  class = "class",
  group = "group",
  user = "user"
}

export const audienceInfo = {
  [AudienceEnum.class]: { display: "Class"},
  [AudienceEnum.group]: { display: "Group"},
  [AudienceEnum.user]: { display: "User"},
};

export enum SupportType {
  teacher = "teacher",
  curricular = "curricular"
}

export enum SupportTarget {
  unit = "unit",
  investigation = "investigation",
  problem = "problem",
  section = "section",
}

export type TeacherSupportSectionTarget = SectionType;

export interface ISupportTarget {
  sectionId?: SectionType;
  groupId?: string;
  userId?: string;
}

export const ClassAudienceModel = types
  .model("ClassAudienceModel", {
    type: types.optional(types.literal(AudienceEnum.class), AudienceEnum.class),
    identifier: types.undefined
  });
export const GroupAudienceModel = types
  .model("GroupAudienceModel", {
    type: types.optional(types.literal(AudienceEnum.group), AudienceEnum.group),
    identifier: types.string
  });
export const UserAudienceModel = types
  .model("UserAudienceModel", {
    type: types.optional(types.literal(AudienceEnum.user), AudienceEnum.user),
    identifier: types.string
  });

export const AudienceModel = types.union(ClassAudienceModel, GroupAudienceModel, UserAudienceModel);
export type AudienceModelType = Instance<typeof AudienceModel>;

export const TeacherSupportModel = types
  .model("TeacherSupportModel", {
    supportType: types.optional(types.literal(SupportType.teacher), SupportType.teacher),
    key: types.identifier,
    support: SupportModel,
    type: types.enumeration<SupportTarget>("SupportTarget", Object.values(SupportTarget)),
    visible: false,
    sectionId: types.maybe(types.enumeration<SectionType>("SectionType", Object.values(SectionType))),
    audience: AudienceModel,
    authoredTime: types.number,
    originDoc: types.maybe(types.string),
    caption: types.maybe(types.string),
    deleted: false
  })
  .views(self => ({
    get sectionTarget(): TeacherSupportSectionTarget {
      return (self.type === SupportTarget.section) && self.sectionId
              ? self.sectionId
              : SectionType.all;
    }
  }))
  .views(self => ({
    get sectionTargetDisplay(): string {
      return getSectionTitle(self.sectionTarget);
    },

    showForUserProblem(target: ISupportTarget) {
      const isUndeleted = !self.deleted;
      const isForSection = self.type === SupportTarget.problem
        || self.type === SupportTarget.section && self.sectionId === target.sectionId;
      const isForUser = self.audience.type === AudienceEnum.class
        || self.audience.type === AudienceEnum.group && self.audience.identifier === target.groupId
        || self.audience.type === AudienceEnum.user && self.audience.identifier === target.userId;
      return isUndeleted && isForSection && isForUser;
    }
  }))
  .actions(self => ({
    setVisible(visible: boolean) {
      self.visible = visible;
    }
  }));

export interface ICreateFromUnitParams {
  unit: UnitModelType;
  investigation?: InvestigationModelType;
  problem?: ProblemModelType;
  documents?: DocumentsModelType;
  db?: DB;
  supports?: CurricularSupportModelType[] | TeacherSupportModelType[];
}

export const CurricularSupportModel = types
  .model("CurricularSupportModel", {
    supportType: types.optional(types.literal(SupportType.curricular), SupportType.curricular),
    support: SupportModel,
    type: types.enumeration<SupportTarget>("SupportTarget", Object.values(SupportTarget)),
    visible: false,
    sectionId: types.maybe(types.string)
  })
  .actions((self) => {
    return {
      setVisible(visible: boolean) {
        self.visible = visible;
      }
    };
  });

export const SupportItemModel = types.union(TeacherSupportModel, CurricularSupportModel);

export const SupportsModel = types
  .model("Supports", {
    curricularSupports: types.array(CurricularSupportModel),
    classSupports: types.array(TeacherSupportModel),
    groupSupports: types.array(TeacherSupportModel),
    userSupports: types.array(TeacherSupportModel)
  })
  .views((self) => ({
    get teacherSupports() {
      return self.classSupports
        .concat(self.groupSupports)
        .concat(self.userSupports);
    }
  }))
  .views((self) => ({
    get allSupports() {
        return (self.curricularSupports as SupportItemModelType[])
        .concat(self.classSupports)
        .concat(self.groupSupports)
        .concat(self.userSupports);
    },

    getSupportsForUserProblem(target: ISupportTarget): SupportItemModelType[] {
        const { sectionId } = target;
        const supports: SupportItemModelType[] = self.curricularSupports.filter((support) => {
          return sectionId ? support.sectionId === sectionId : true;
        });

        const teacherSupports = self.teacherSupports.filter(support => {
          return support.showForUserProblem(target);
        });

        return supports.concat(teacherSupports);
    }
  }))
  .actions((self) => {
    return {
      createFromUnit(params: ICreateFromUnitParams) {
        const { unit, investigation, problem, documents } = params;
        const supports: CurricularSupportModelType[] = [];
        const createItem = (type: SupportTarget, sectionId?: string) => {
          return (support: SupportModelType) => {
            supports.push(CurricularSupportModel.create({
              support: cloneDeep(support),
              type: type as SupportTarget,
              sectionId
            }));
          };
        };

        unit.supports.forEach(createItem(SupportTarget.unit));
        investigation && investigation.supports.forEach(createItem(SupportTarget.investigation));
        problem && problem.supports.forEach(createItem(SupportTarget.problem));
        problem && problem.sections.forEach((section) => {
          section.supports.forEach(createItem(SupportTarget.section, section.id));
        });

        self.curricularSupports.replace(supports);

        if (documents) {
          addSupportDocumentsToStore({ supports, ...params });
        }
      },

      setAuthoredSupports(supports: TeacherSupportModelType[], audienceType: AudienceEnum) {
        const currSupports = audienceType === AudienceEnum.class
          ? self.classSupports
          : audienceType === AudienceEnum.group
            ? self.groupSupports
            : self.userSupports;
        currSupports.clear();
        supports
          .sort((supportA, supportB) => supportA.authoredTime - supportB.authoredTime)
          .forEach(support => currSupports.push(support));
      },

      hideSupports() {
          self.allSupports.forEach((supportItem: SupportItemModelType) => supportItem.setVisible(false));
      },

      toggleSupport(supportItem: SupportItemModelType) {
        const visible = !supportItem.visible;
        self.allSupports.forEach((_supportItem: SupportItemModelType) => {
          _supportItem.setVisible((_supportItem === supportItem) && visible);
        });
        if (visible) {
          Logger.log(LogEventName.VIEW_SHOW_SUPPORT, {
            text: supportItem.support.content
          });
        }
      }
    };
  });

export type CurricularSupportModelType = Instance<typeof CurricularSupportModel>;
export type TeacherSupportModelType = Instance<typeof TeacherSupportModel>;
export type UnionSupportModelType = CurricularSupportModelType | TeacherSupportModelType;
export type SupportItemModelType = Instance<typeof SupportItemModel>;
export type SupportsModelType = Instance<typeof SupportsModel>;

function getTeacherSupportCaption(support: TeacherSupportModelType,
                                  investigation?: InvestigationModelType, problem?: ProblemModelType) {
  const investigationPart = investigation ? `${investigation.ordinal}` : "*";
  const problemPart = problem ? `${problem.ordinal}` : "*";
  const { sectionId } = support;
  const sectionPart = sectionId ? " " + getSectionAbbrev(sectionId as SectionType) : "";
  return `${investigationPart}.${problemPart}${sectionPart} ${support.caption || "Untitled"}`;
}

function getCurricularSupportCaption(support: CurricularSupportModelType, index: number,
                                     investigation?: InvestigationModelType, problem?: ProblemModelType) {
  const investigationPart = investigation ? `${investigation.ordinal}` : "*";
  const problemPart = problem ? `${problem.ordinal}` : "*";
  const { sectionId } = support;
  const sectionPart = sectionId ? " " + getSectionTitle(sectionId as SectionType) : "";
  return `${investigationPart}.${problemPart}${sectionPart} Support ${index}`;
}

function getSupportCaption(support: UnionSupportModelType, index: number,
                           investigation?: InvestigationModelType, problem?: ProblemModelType) {
  return support.supportType === SupportType.teacher
          ? getTeacherSupportCaption(support, investigation, problem)
          : getCurricularSupportCaption(support, index, investigation, problem);
}

export function addSupportDocumentsToStore(params: ICreateFromUnitParams) {
  const { db, documents, investigation, problem, supports } = params;
  let index = 0;
  let lastSection: string | undefined;
  supports && supports.forEach(async (support: UnionSupportModelType) => {
    const { supportType, sectionId } = support;
    if (sectionId === lastSection) {
      ++index;
    }
    else {
      index = 1;
      lastSection = sectionId;
    }
    const supportCaption = getSupportCaption(support, index, investigation, problem);
    const supportKey = supportType === SupportType.teacher
                        ? (support as TeacherSupportModelType).key || supportCaption
                        : supportCaption;
    const originDoc = supportType === SupportType.teacher
                        ? (support as TeacherSupportModelType).originDoc
                        : undefined;
    const properties: IDocumentProperties = supportType === SupportType.curricular
                                              ? { curricularSupport: "true", caption: supportCaption }
                                              : { teacherSupport: "true", caption: supportCaption };
    const content = await getDocumentContentForSupport(support.support, db);
    if (content) {
      const document = DocumentModel.create({
                        uid: "curriculum",
                        type: SupportPublication,
                        key: supportKey,
                        originDoc,
                        properties,
                        createdAt: Date.now(),
                        content: getSnapshot(content)
                      });
      documents && documents.add(document);
    }
  });
}

export async function getDocumentContentForSupport(support: SupportModelType, db?: DB) {
  let content: DocumentContentSnapshotType | IAuthoredDocumentContent | undefined;
  switch (support.type) {
    case ESupportType.document:
      content = safeJsonParse(support.content);
      break;
    case ESupportType.publication:
      if (db) {
        const contentPath = `${support.content}/content`;
        const contentRef = db.firebase.ref(contentPath);
        const snapshot = await contentRef.once("value");
        content = snapshot && safeJsonParse(snapshot.val());
      }
      break;
    case ESupportType.text:
    default:
      content = {
        tiles: [
          {
            content: {
              type: "Text",
              text: support.content
            }
          }
        ]
      };
      break;
  }
  return content ? DocumentContentModel.create(content) : undefined;
}
