class Annotation {
  set lemmaColumn(column) {
    if (column === undefined) {
      this.lemmas = [this.type];
      this.text.forEach((token) => (token.lemma = this.type));
    } else {
      this.assignColumn("lemma", column);
      this.lemmas = [...new Set(this.text.map((token) => token[column]))];
    }
  }
  constructor(ann) {
    console.log(ann.text);
    this._source = ann.text;

    this.type = ann.type;
    this.file = ann.file;
    this.columnMapping =
      ann.columnMapping !== undefined ? ann.columnMapping : {};

    this.text = this._source.map(
      (line) => new ConcordanceLine(line, this.columnMapping)
    );
    this.lemmaColumn = this.columnMapping.lemma;

    ann.variables === undefined || ann.variables.length == 0
      ? (this.variables = [])
      : ann.variables.forEach((variable) => this.addVariable(variable));
    console.log(ann.variables);
    console.log(this.variables);
    this.displayed = 0;
    this.annField = d3.select(`#${this.type}-Annotation`);
  }

  assignColumn(role, column) {
    this.text.forEach(
      (token, index) => (token[role] = this._source[index][column])
    );
    this.columnMapping[role] = column;
  }
  get toFile() {
    return {
      type: this.type,
      file: this.file,
      variables: this.variables.map((v) => v.name),
      lemmas: this.lemmas,
      columnMapping: this.columnMapping,
      annotation: Object.fromEntries(
        this.text
          .filter((token) => token._annotation.variables.length > 0)
          .map((token) => [token.id, token._annotation.notes])
      ),
    };
  }
  tabulate() {
    return this.text.map((token) => token.print);
  }

  varEditor(concList, node, variable, settings) {
    d3.select(node)
      .attr("class", "btn btn-concFile btn-checkbox px-1")
      .classed(
        "active",
        this.variables.map((v) => v.name).indexOf(variable.name) !== -1
      )
      .text(this.type)
      .attr("value", this.type)
      .on("click", (d) => {
        d.variables.map((v) => v.name).indexOf(variable.name) === -1
          ? d.variables.push(variable)
          : (d.variables = d.variables.filter((v) => v.name !== variable.name));
        concList
          .selectAll("btn-concFile")
          .classed(
            "active",
            (d) => d.variables.map((v) => v.name).indexOf(variable.name) !== -1
          );
        d.listVariables(settings);
        d.openAnnotation();
      });
  }

  listVariables(settings) {
    const varList = d3
      .select(`#${this.type}-variables`)
      .selectAll("button")
      .data(settings.variables, (d) => d.name);

    varList
      .enter()
      .append("button")
      .merge(varList)
      .attr("class", "btn btn-concVar btn-checkbox px-1")
      .classed("active", (d) => this.variables.indexOf(d) !== -1)
      .text((d) => d.name)
      .attr("value", (d) => d.name)
      .attr("disabled", (d) => {
        return (
          (d.type === "categorical" &&
            d3.keys(d.values).indexOf("defaultLemma") === -1 &&
            this.lemmas.filter((l) => d3.keys(d.values).indexOf(l) === -1)
              .length > 1) ||
          null
        );
      })
      .on("click", (d) => {
        this.variables.indexOf(d) === -1
          ? this.addVariable(d)
          : this.removeVariable(d);
        varList
          .selectAll("button")
          .classed("active", (d) => this.variables.indexOf(d) !== -1);
        this.openAnnotation();
        UserInterface.variablesEditor(settings);
      });

    varList.exit().remove();
  }
  addVariable(variable) {
    if (this.variables === undefined) this.variables = [];
    this.variables.push(variable);
    this.text.forEach((token) => token.addVariable(variable));
  }
  removeVariable(variable) {
    this.variables = this.variables.filter((v) => v !== variable);
    this.text.forEach((token) => token.removeVariable(variable));
  }
  listColumns(selection, settings) {
    const columnList = selection.selectAll("button").data(
      ["id", "left", "target", "right"].map((d) => {
        const column =
          this._source.columns.indexOf(d) !== -1 ? d : this.columnMapping[d];
        return { role: d, column: column };
      }),
      (d) => d
    );

    columnList
      .enter()
      .append("button")
      .merge(columnList)
      .attr("class", "btn btn-concCol btn-checkbox px-1")
      .classed("active", (d) => d.column !== undefined)
      .text((d) => `${d.role} = ${d.column}`)
      .attr("value", (d) => d.column)
      .on("click", (d) => {
        console.log(this._source.columns)
        console.log(d.role)
        Sw.mapColumns(this._source.columns, d.role).then((result) => {
          if (result.value) {
            this.assignColumn(d.role, this._source.columns[result.value]);
          }
          this.listColumns(selection, settings);
          this.openAnnotation();
          this.annSpace.selectAll(".concInit")
            .select("p")
            .html(
              (d) => `${d.left} <span class='target'>${d.target}</span> ${d.right}`
            );
          this.overview
            .each((d) => {
              d.writeOverview(this);
            });
        });

      });

    columnList.exit().remove();
  }

  openAnnotation() {
    const workspace = this.annVars.selectAll("div.task").data(
      (d) =>
        this.variables.map((v, i) => {
          return {
            token: d,
            variable: v,
            i: i,
          };
        }),
      (d) => d
    );

    workspace
      .enter()
      .append("div")
      .attr("class", "task")
      .each((d, i, nodes) => Workspace.fillAnnotation(nodes[i], d))
      .merge(workspace);

    workspace.exit().remove();
  }

  displayLine() {
    d3.select(`#${this.type}-Annotation`)
      .selectAll(".concAnalysis")
      .style("display", (d) => {
        // console.log(d.id === settings.concFiles[concName].displayed);
        return d.id === this.text[this.displayed].id ? "block" : "none";
      });
  }

  fillConcCard(node, settings) {
    let concCard = d3.select(node);
    const concCardTitle = concCard
      .append("div")
      .style("display", "grid")
      .style("grid-template-columns", "minmax(80px, 90%) minmax(5px, 10%)");

    concCardTitle
      .append("div")
      .attr("class", "card-title")
      .text(this.type)
      .attr("contenteditable", "true");

    concCardTitle
      .append("div")
      .append("button")
      .attr("class", "btn btn-light p-0")
      .append("i")
      .attr("class", "fas fa-save")
      .on("click", () => {
        this.type = concCardTitle.select(".card-title").html();
        UserInterface.editConcordance(settings.annotations);
      });

    concCard
      .append("p")
      .attr("class", "card-text")
      .html(`<b>Number of lines:</b> ${this.text.length}`);

    concCard
      .append("p")
      .attr("class", "card-text")
      .attr("id", `${this.type}-lemmas`)
      .html(`<b>Includes lemmas:</b> ${this.lemmas.join(", ")}`)
      .style("cursor", "pointer")

      .on("click", () => {
        const placeholder =
          this._source.columns.indexOf("lemma") === -1
            ? this._source.columns[0]
            : "lemma";
        Sw.selectLemmaColumn(this._source.columns, placeholder).then(
          (result) => {
            if (result.value) {
              this.lemmaColumn = this._source.columns[result.value];
              console.log(this.lemmas);
              d3.select(`#${this.type}-lemmas`).html(
                `<b>Includes lemmas:</b> ${this.lemmas.join(", ")}`
              );
            }
          }
        );
      });

    concCard.append("p");

    concCard.append("h6").text("Columns").style("font-weight", "bold");

    const columnList = concCard
      .append("p")
      .attr("class", "card-text")
      .append("span")
      .attr("class", "btn-group-toggle")
      .attr("data-toggle", "buttons")
      .attr("id", `${this.type}-columns`);
    this.listColumns(columnList, settings);

    concCard.append("h6").text("Variables").style("font-weight", "bold");

    concCard
      .append("p")
      .attr("class", "card-text")
      .append("span")
      .attr("class", "btn-group-toggle")
      .attr("data-toggle", "buttons")
      .attr("id", `${this.type}-variables`);

    concCard
      .append("footer")
      .append("div")
      .style("width", "100%")
      .call(UserInterface.remButton)
      .on("click", (d) => {
        settings.annotations = settings.annotations.filter(ann !== d);
        concCard.remove();
        listConcordances(settings.annotations);
      });

    this.listVariables(settings);
  }

  setUpConcordance(node) {
    let viewer = d3.select(node);

    viewer
      .append("div")
      .attr("class", "nav nav-tabs")
      .attr("role", "tablist")
      .selectAll("a")
      .data(["Overview", "Annotation"], (d) => d)
      .enter()
      .append("a")
      .attr("class", "nav-item nav-link")
      .attr("id", (d) => `${this.type}-${d}-tab`)
      .attr("data-toggle", "tab")
      .attr("href", (d) => `#${this.type}-${d}`)
      .attr("role", "tab")
      .attr("aria-controls", (d) => d)
      .text((d) => d)
      .classed("active", (d) => d === "Overview");

    viewer
      .append("div")
      .attr("class", "tab-content")
      .selectAll("div.tab-pane")
      .data(["Overview", "Annotation"], (d) => d)
      .enter()
      .append("div")
      .attr("class", "tab-pane fade")
      .classed("show active", (d) => d === "Overview")
      .attr("id", (d) => `${this.type}-${d}`)
      .attr("role", "tabpanel")
      .attr("labelledby", (d) => `${this.type}-${d}-tab`)
      .each((d) => {
        console.log("setting up concordance")
        const thisTab = viewer.select(`#${this.type}-${d}`);
        d === "Overview"
          ? this.showOverview(thisTab)
          : this.showConcordanceLines(thisTab);
      });
  }
  showConcordanceLines(selection) {
    this.annSpace = selection
      .selectAll("div.concAnalysis")
      .style("justify-content", "center")
      .data(this.text, (d) => d)
      .enter()
      .append("div")
      .attr("class", "concAnalysis mt-4")
      .attr("token_id", (d) => d.id);

    this.annSpace.exit().remove();

    this.annSpace
      .append("div")
      .attr("class", "concInit")
      .append("p")
      .style("text-align", "center")
      .html(
        (d) => `${d.left} <span class='target'>${d.target}</span> ${d.right}`
      );

    this.annVars = this.annSpace.append("div").attr("class", "concVariables");

    if (this.variables.length > 0) {
      this.openAnnotation();
    }

    const moveAround = this.annSpace
      .append("div")
      .style("display", "grid")
      .style("place-items", "center")
      .append("div")
      .attr("class", "btn-group btn-group-lg btn-group-toggle")
      .attr("role", "group")
      .attr("data-toggle", "buttons");

    moveAround
      .append("button")
      .attr("class", "btn btn-primary")
      .text("Previous")
      .on("click", () => {
        this.displayed -= 1;
        this.displayLine();
      });

    moveAround
      .append("button")
      .attr("class", "btn btn-primary")
      .text("Next")
      .on("click", () => {
        this.displayed += 1;
        this.displayLine();
      });
  }

  showOverview(selection) {
    this.overview = selection
      .append("div")
      .attr("class", "mt-4")
      .style("height", "80vh")
      .style("overflow", "auto")
      .selectAll("div.concOverview")
      .data(this.text)
      .enter()
      .append("div")
      .attr("class", "concOverview")

    this.overview.each((d, i, nodes) => {
      d.printOverview(nodes[i]);
      d.writeOverview(this)
    });
  }
}
