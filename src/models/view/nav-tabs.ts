import { types, SnapshotIn, Instance } from "mobx-state-tree";
import { UserModelType } from "../stores/user";
import { UserTypeEnum } from "../stores/user-types";

export enum ENavTab {
  kProblems = "problems",
  kTeacherGuide = "teacher-guide",
  kStudentWork = "student-work",
  kMyWork = "my-work",
  kClassWork = "class-work",
  kLearningLog = "learning-log",
  kSupports = "supports"
}

// generic type which maps tab id to values of another type
export type NavTabMap<T> = {
  [K in ENavTab]: T;
};

export enum ENavTabSectionType {
  kPersonalDocuments = "personal-documents",
  kProblemDocuments = "problem-documents",
  kLearningLogs = "learning-logs",
  kPublishedPersonalDocuments = "published-personal-documents",
  kPublishedProblemDocuments = "published-problem-documents",
  kPublishedLearningLogs = "published-learning-logs",
  kStarredPersonalDocuments = "starred-personal-documents",
  kStarredProblemDocuments = "starred-problem-documents",
  kStarredLearningLogs = "starred-learning-logs",
  kCurricularSupports = "curricular-supports",
  kTeacherSupports = "teacher-supports"
}

export enum ENavTabOrder {
  kOriginal = "original",
  kReverse = "reverse"
}
const ENavTabOrderMSTType =
        types.enumeration<ENavTabOrder>("ENavTabOrder", Object.values(ENavTabOrder));

export const NavTabSectionModel =
  types.model("NavTabSectionModel", {
    className: "",
    title: types.string,
    type: types.enumeration<ENavTabSectionType>("ENavTabSectionType", Object.values(ENavTabSectionType)),
    dataTestHeader: "section-header",
    dataTestItem: "section-item",
    documentTypes: types.array(types.string),
    order: types.optional(ENavTabOrderMSTType, ENavTabOrder.kReverse),
    properties: types.array(types.string),
    showStars: types.array(UserTypeEnum),
    showGroupWorkspaces: false,
    addDocument: false
  })
  .views(self => ({
    showStarsForUser(user: UserModelType) {
      return user.type && (self.showStars.indexOf(user.type) !== -1);
    },
    showDeleteForUser(user: UserModelType, userDocument?: any) { //DocumentModelType is a circular logic?
      const userOwnsDocument = (userDocument && (user.id === userDocument || user.id === userDocument.uid));
      // allow users to delete published document
      const deletableTypes = [ENavTabSectionType.kPublishedPersonalDocuments,
        ENavTabSectionType.kPublishedProblemDocuments,
        ENavTabSectionType.kPublishedLearningLogs,
        ENavTabSectionType.kTeacherSupports,
       ];
      return (deletableTypes.includes(self.type) && userOwnsDocument);
    },
  }));
export type NavTabSectionSpec = SnapshotIn<typeof NavTabSectionModel>;
export type NavTabSectionModelType  = Instance<typeof NavTabSectionModel>;

export const NavTabModel =
  types.model("NavTab", {
    tab: types.enumeration<ENavTab>("ENavTab", Object.values(ENavTab)),
    label: types.string,
    teacherOnly: false,
    sections: types.array(NavTabSectionModel)
  });
export type NavTabSpec = SnapshotIn<typeof NavTabModel>;
export type NavTabModelType = Instance<typeof NavTabModel>;

export function navTabSectionId(section: NavTabSectionSpec) {
  const title = section.title.toLowerCase().replace(" ", "-");
  return `${section.type}-${title}`;
}
