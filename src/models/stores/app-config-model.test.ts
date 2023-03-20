import { SectionModel } from "../curriculum/section";
import { AppConfigModel } from "./app-config-model";
import { unitConfigDefaults, unitConfigOverrides } from "../../test-fixtures/sample-unit-configurations";

describe("ConfigurationManager", () => {

  const excludeProps = ["defaultDocumentTemplate", "navTabs", "planningTemplate"];
  type SimpleProps = Exclude<keyof typeof unitConfigDefaults, typeof excludeProps[number]>;
  const keys = Object.keys(unitConfigDefaults).filter(prop => !excludeProps.includes(prop)) as SimpleProps[];

  it("can be constructed with just unitConfigDefaults and return those unitConfigDefaults", () => {
    const appConfig = AppConfigModel.create({ curriculumBaseUrl: "https://curriculum.example.com", config: unitConfigDefaults });
    keys.forEach((prop: SimpleProps) => {
      expect(appConfig[prop]).toEqual(unitConfigDefaults[prop]);
    });
    expect(appConfig.defaultDocumentTemplate).toBeUndefined();
    expect(appConfig.getSetting("foo")).toBeUndefined();
    expect(appConfig.getSetting("foo", "bar")).toBeUndefined();
  });

  it("can be constructed with unitConfigDefaults and unitConfigOverrides and return the unitConfigOverrides", () => {
    const appConfig = AppConfigModel.create({ curriculumBaseUrl: "https://curriculum.example.com", config: unitConfigDefaults });
    appConfig.setConfigs([unitConfigOverrides]);
    keys.forEach((prop: SimpleProps) => {
      if (prop === "disabledFeatures") {
        // disabledFeatures are merged
        expect(appConfig[prop]).toEqual(["foo", "bar"]);
      }
      else {
        expect(appConfig[prop]).toEqual(unitConfigOverrides[prop]);
      }
    });
    expect(appConfig.defaultDocumentTemplate).toBeUndefined();
    const section = SectionModel.create({ type: "intro" });
    expect(appConfig.getDisabledFeaturesOfSection(section)).toEqual(["foo", "bar"]);
    expect(appConfig.getDisabledFeaturesOfTile("", section)).toEqual(["foo", "bar"]);
    expect(appConfig.getDisabledFeaturesOfTile("Tile", section)).toEqual([]);
    expect(appConfig.isFeatureSupported("foo")).toBe(false);
    expect(appConfig.isFeatureSupported("baz")).toBe(true);
  });

  // TODO: Rewrite these tests.
  // it("can look up a unit by id", () => {
  //   const appConfig = AppConfigModel.create({
  //     config: unitConfigDefaults,
  //     units: { example: { content: "curriculum/example-curriculum/example-curriculum.json" } },
  //     defaultUnit: "example"
  //   });
  //   expect(appConfig.getUnit("foo")).toBeUndefined();
  //   expect(appConfig.getUnitBasePath("foo")).toBe("");
  //   expect(appConfig.getUnit("example")).toBeDefined();
  //   expect(appConfig.getUnitBasePath("example")).toBe("curriculum/example-curriculum");
  // });
});
