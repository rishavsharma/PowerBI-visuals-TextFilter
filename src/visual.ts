
"use strict";
import "@babel/polyfill";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import FilterAction = powerbi.FilterAction;
import * as models from 'powerbi-models';
import IFilter = powerbi.IFilter;
import IBasicFilter = models.IBasicFilter
import { dataViewObject } from 'powerbi-visuals-utils-dataviewutils';
import 'powerbi-visuals-utils-interactivityutils';
import { VisualSettings } from "./settings";
export class Visual implements IVisual {
  private target: HTMLElement;
  private searchBox: HTMLInputElement;
  private searchButton: HTMLButtonElement;
  private clearButton: HTMLButtonElement;
  private column: powerbi.DataViewMetadataColumn;
  private host: powerbi.extensibility.visual.IVisualHost;
  private autoComplete = null;
  private settings: VisualSettings;

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.target.innerHTML = `<div class="text-filter-search">
                                    <input aria-label="Enter your search" type="text" placeholder="Search" name="search-field">
                                    <button class="c-glyph search-button" name="search-button">
                                      <span class="x-screen-reader">Search</span>
                                    </button>
                                    <button class="c-glyph clear-button" name="clear-button">
                                      <span class="x-screen-reader">Clear</span>
                                    </button>
                                </div>`;
    this.searchBox = this.target.childNodes[0].childNodes[1] as HTMLInputElement;
    this.searchBox.addEventListener("keydown", (e) => {
      if (e.keyCode == 13) {
        this.performSearch(this.searchBox.value);
      }
    });
    this.searchButton = this.target.childNodes[0].childNodes[3] as HTMLButtonElement;
    this.searchButton.addEventListener("click", () => this.performSearch(this.searchBox.value));
    this.clearButton = this.target.childNodes[0].childNodes[5] as HTMLButtonElement;
    this.clearButton.addEventListener("click", () => this.performSearch(''));

    this.host = options.host;
  }

  public update(options: VisualUpdateOptions) {
    this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
    const metadata = options.dataViews && options.dataViews[0] && options.dataViews[0].metadata;
    const newColumn = metadata && metadata.columns && metadata.columns[0];
    const objectCheck = metadata && metadata.objects;
    const properties = dataViewObject.getValue(objectCheck, "general") as any || {};
    let searchText = "";
    console.log(options);
    // We had a column, but now it is empty, or it has changed.
    if (options.dataViews && options.dataViews.length > 0 && this.column && (!newColumn || this.column.queryName !== newColumn.queryName)) {
      this.performSearch("");

      // Well, it hasn't changed, then lets try to load the existing search text.
    } else if (properties.filter) {
      console.log(properties)
      const appliedFilter: IBasicFilter = options.jsonFilters[0] as IBasicFilter;
      if (appliedFilter && appliedFilter.values && appliedFilter.values.length > 0) {
        searchText = (appliedFilter.values.join(",") || "");
      }
    }

    this.searchBox.value = searchText;
    this.column = newColumn;
  }

  public performSearch(text: string) {
    if (this.column) {
      const isBlank = ((text || "") + "").match(/^\s*$/);
      const target = {
        table: this.column.queryName.substr(0, this.column.queryName.indexOf('.')),
        column: this.column.queryName.substr(this.column.queryName.indexOf('.') + 1)
      };

      let filter: any = null;
      let action = FilterAction.remove;
      if (!isBlank) {
        filter = {
          target,
          operator: "In",
          values: text.split(',')
        }
        // filter = new models.AdvancedFilter(
        //   target,
        //   "And",
        //   {
        //     operator: "Contains",
        //     value: text
        //   }
        // );
        action = FilterAction.merge;
      }
      this.host.applyJsonFilter(filter, "general", "filter", action);
    }
    this.searchBox.value = text;
  }
  private static parseSettings(dataView: DataView): VisualSettings {
    return VisualSettings.parse(dataView) as VisualSettings;
  }

  /**
   * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
   * objects and properties you want to expose to the users in the property pane.
   *
   */
  public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
    return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
  }
}