import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
import './CSS/ContactsControl.css';

type DataSet = ComponentFramework.PropertyTypes.DataSet;

export class ContactsControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container: HTMLDivElement;
  private searchInput: HTMLInputElement;
  private currentSortColumn: string;
  private isAscending: boolean = true;

  private currentPage: number = 1;
  private recordsPerPage: number = 13;

  constructor() {}

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.loadStyles();
    this.createSearchInput(context);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.renderTable(context);
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }

  private loadStyles(): void {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./styles.css";
    document.head.appendChild(link);
  }

  private createSearchInput(context: ComponentFramework.Context<IInputs>): void {
    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Search by Fullname or other fields...";
    this.searchInput.classList.add("search-input");

    this.searchInput.addEventListener("input", () => {
      this.currentPage = 1; // Reset to first page when searching
      this.updateView(context);
    });

    this.container.appendChild(this.searchInput);
  }

  private renderTable(context: ComponentFramework.Context<IInputs>): void {
    this.container.innerHTML = ""; // Clear previous content

    const searchQuery = this.searchInput.value.trim().toLowerCase();
    const table = document.createElement("table");
    const headerRow = document.createElement("tr");

    context.parameters.sampleDataSet.columns.forEach((column) => {
      const headerCell = document.createElement("th");
      headerCell.innerHTML = `${column.displayName} ${this.getSortIndicator(column.name)}`;
      headerCell.classList.add("sortable-header");
      headerCell.addEventListener("click", () => this.sortTable(context, column.name));
      headerRow.appendChild(headerCell);
    });

    table.appendChild(headerRow);

    const sortedRecords = [...context.parameters.sampleDataSet.sortedRecordIds];

    if (this.currentSortColumn) {
      sortedRecords.sort((a, b) => {
        const recordA = context.parameters.sampleDataSet.records[a].getFormattedValue(this.currentSortColumn) || "";
        const recordB = context.parameters.sampleDataSet.records[b].getFormattedValue(this.currentSortColumn) || "";
        
        return this.isAscending ? recordA.localeCompare(recordB) : recordB.localeCompare(recordA);
      });
    }

    // Apply search filtering with priority for "fullname"
    const filteredRecords = sortedRecords.filter((recordId) => {
      const currentRecord = context.parameters.sampleDataSet.records[recordId];

      const fullNameValue = currentRecord.getFormattedValue("fullname")?.toLowerCase() || "";
      const matchesFullName = fullNameValue.includes(searchQuery);

      const matchesOtherFields = context.parameters.sampleDataSet.columns.some((column) =>
        currentRecord.getFormattedValue(column.name)?.toLowerCase().includes(searchQuery)
      );

      return matchesFullName || matchesOtherFields;
    });

    // Pagination setup
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / this.recordsPerPage);
    this.currentPage = Math.min(this.currentPage, totalPages) || 1; // Ensure currentPage is within bounds

    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + this.recordsPerPage);

    // Render paginated records
    paginatedRecords.forEach((recordId) => {
      const currentRecord = context.parameters.sampleDataSet.records[recordId];
      const tableRow = document.createElement("tr");

      context.parameters.sampleDataSet.columns.forEach((column) => {
        const value = currentRecord.getFormattedValue(column.name) || "";
        const highlightedValue = this.highlightText(value, searchQuery);

        const tableRowCell = document.createElement("td");
        tableRowCell.innerHTML = highlightedValue;
        tableRow.appendChild(tableRowCell);
      });

      tableRow.addEventListener("click", () => {
        this.showCustomAlert("Selected Record", `You selected <b>${currentRecord.getFormattedValue("fullname")}</b>.`);
      });

      table.appendChild(tableRow);
    });

    this.container.appendChild(table);
    this.renderPaginationControls(totalPages, context);
  }

  private renderPaginationControls(totalPages: number, context: ComponentFramework.Context<IInputs>): void {
    const paginationDiv = document.createElement("div");
    paginationDiv.classList.add("pagination");

    const prevButton = document.createElement("button");
    prevButton.innerText = "Previous";
    prevButton.disabled = this.currentPage === 1;
    prevButton.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.updateView(context);
      }
    });

    const nextButton = document.createElement("button");
    nextButton.innerText = "Next";
    nextButton.disabled = this.currentPage === totalPages;
    nextButton.addEventListener("click", () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.updateView(context);
      }
    });

    paginationDiv.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement("button");
      pageButton.innerText = i.toString();
      pageButton.classList.add(i === this.currentPage ? "active" : "");
      pageButton.addEventListener("click", () => {
        this.currentPage = i;
        this.updateView(context);
      });

      paginationDiv.appendChild(pageButton);
    }

    paginationDiv.appendChild(nextButton);
    this.container.appendChild(paginationDiv);
  }

  private highlightText(value: string, searchQuery: string): string {
    if (!searchQuery) return value;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    return value.replace(regex, `<span class="highlight">$1</span>`);
  }

  private sortTable(context: ComponentFramework.Context<IInputs>, columnName: string): void {
    if (this.currentSortColumn === columnName) {
      this.isAscending = !this.isAscending;
    } else {
      this.currentSortColumn = columnName;
      this.isAscending = true;
    }

    this.updateView(context);
  }

  private getSortIndicator(columnName: string): string {
    if (this.currentSortColumn !== columnName) return "";
    return this.isAscending ? "▲" : "▼";
  }

  private showCustomAlert(title: string, message: string): void {
    document.querySelector("#customAlert")?.remove();

    const modal = document.createElement("div");
    modal.id = "customAlert";
    modal.classList.add("modal");

    const modalTitle = document.createElement("h3");
    modalTitle.innerHTML = title;
    modal.appendChild(modalTitle);

    const modalMessage = document.createElement("p");
    modalMessage.innerHTML = message;
    modal.appendChild(modalMessage);

    const closeButton = document.createElement("button");
    closeButton.innerText = "OK";
    closeButton.classList.add("modal-button");
    closeButton.addEventListener("click", () => modal.remove());
    modal.appendChild(closeButton);

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);
  }
}
