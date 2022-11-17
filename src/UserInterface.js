class UserInterface {
  constructor() {}

  static drawNavbar() {
    d3.select("#navbarTop")
      .selectAll("li")
      .data([
        { code: "start", text: "Start" },
        { code: "settings", text: "Project settings" },
        { code: "workspace", text: "Workspace" },
        { code: "save", text: "Save" },
      ])
      .enter()
      .append("li")
      .attr("class", "nav-item")
      .append("a")
      .attr("class", "nav-link p-2")
      .classed("active", (d) => d.code === "start")
      .attr("id", (d) => d.code + "-tab")
      .attr("data-toggle", "tab")
      .attr("href", (d) => "#" + d.code)
      .attr("role", "tab")
      .attr("aria-controls", (d) => d.code)
      .attr("aria-selected", (d) => d.code === "start")
      .text((d) => d.text)
      .on("click", (d) => {
        if (d.code !== "save") {
          d3.select("#navbarTop")
            .selectAll("a")
            .classed("active", (dd) => dd.code === d.code)
            .each((dd) =>
              d3.select("#" + dd.code).classed("active", dd.code === d.code)
            );
        }
      });
  }

  static setup(settings) {
    d3.select("#loadSettings").on("click", async () => {
      const files = await window.electronAPI.openFile("json");
      settings.subload(files[0]);
    });

    d3.select("#nav-conc-tab").on("click", () => {
      d3.select("#nav-conc").classed("show active", true);
      d3.select("#nav-conc-tab").classed("active", true);
      d3.selectAll(".varEdit").classed("active", false);
      d3.select("#editVariables")
        .selectAll("div.tab-pane")
        .classed("show active", false);
    });
    d3.select("#newVariables").on("click", () => {
      $("#newVariableModal").modal("show");
    });

    UserInterface.drawNavbar();
    d3.select("#save-tab").on("click", () => {
      settings.askSave();
    });
    d3.selectAll(".concLoader").on("click", async () => {
      const files = await window.electronAPI.openFile("tsv");
      settings.loadConc(files);
    });

    d3.select("#newVariableBody")
      .selectAll("div.card")
      .data(UserInterface.variableTypes)
      .enter()
      .append("div")
      .attr("class", "card")
      .each((d, i, nodes) => this.fillCard(nodes[i], settings));

    d3.select("#saveModal").on("click", () => {
      this.listVariables(settings);
      $("#newVariableModal").modal("hide");
    });

    d3.select("#projectName").text(settings.projectName).node().onkeyup = () =>
      (settings.projectName = d3.select("#projectName").html());

    this.listVariables(settings);
  }
  static fillCard(node, settings) {
    let card = d3.select(node);
    card
      .append("h5")
      .attr("class", "card-title")
      .text((d) => d.title)
      .style("font-weight", "bold");
    card
      .append("p")
      .attr("class", "card-text")
      .text((d) => d.description);

    card
      .append("img")
      .attr("class", "card-img-top")
      .attr("src", (d) => (d.img !== undefined ? d.img : ""))
      .attr("alt", (d) => "Card image " + d.name);

    card
      .append("div")
      .attr("class", "centered")
      .append("button")
      .attr("class", "btn-centered")
      .text("This one!")
      .on("click", (d) => {
        const newVar = new d.class();
        if (newVar.type === "categorical") {
          newVar.create(settings);
        } else {
          newVar.name = settings.defaultVarName(newVar.type);

          newVar.add(settings);
        }
      });
  }
  static variableTypes = [
    {
      name: "confidence",
      title: "Stars",
      description:
        "Star rating, e.g. to rate the confidence of your annotation.",
      img: "assets/confidence.png",
      class: Confidence,
    },
    {
      name: "cues",
      title: "Context word selection",
      description:
        "Clickable version of the concordance line, with each space-separated item as a button.",
      img: "assets/cues.png",
      class: Cues,
    },
    {
      name: "input",
      title: "Input text",
      description: "Open input box, e.g. to make a comment.",
      img: "assets/comments.png",
      class: Input,
    },
    {
      name: "numeric",
      title: "Numeric variable",
      description: "Numeric input box.",
      img: "assets/numeric.png",
      class: Numeric,
    },
    {
      name: "categorical",
      title: "Categorical variable",
      description:
        "Variable with discrete categories: buttons show the description and a code is loaded instead.",
      class: CategoricalVariable,
    },
  ];

  static listVariables(settings) {
    const varList = d3
      .select("#variablesList")
      .selectAll(".varEdit")
      .data(settings.variables, (d) => d);

    varList
      .enter()
      .append("a")
      .merge(varList)
      .attr("class", "nav-link varEdit")
      .attr("id", (d) => d.name + "-tab")
      .attr("href", (d) => "#" + d.name + "-edit")
      .attr("aria-controls", (d) => d.name)
      .classed("active", (d) => settings.variables.indexOf(d) === 0)
      .text((d) => d.name)
      .style("font-weight", "bold")
      .on("click", (d) => UserInterface.selectVariable(d));

    varList.exit().remove();
    d3.select("#nav-conc-tab").classed("active", false);
    d3.select("#nav-conc").classed("show active", false);
    UserInterface.variablesEditor(settings);
    settings.annotations.forEach((concFile) =>
      concFile.listVariables(settings)
    );
  }

  static selectVariable(d) {
    d3.selectAll(".varEdit").classed("active", (dd) => dd.name === d.name);
    d3.select("#editVariables")
      .selectAll("div.tab-pane")
      .classed("show active", (dd) => dd.name === d.name);
    d3.select("#nav-conc-tab").classed("active", false);
    d3.select("#nav-conc").classed("show active", false);
  }

  static variablesEditor(settings) {
    const { variables } = settings;
    const varEditor = d3
      .select("#editVariables")
      .selectAll(".varEditField")
      .data(variables);

    const varTabs = varEditor
      .enter()
      .append("div")
      .attr("class", "tab-pane fade varEditField")
      .classed("show active", (d) => variables.indexOf(d) === 0)
      .attr("id", (d) => d.name + "-edit")
      .attr("role", "tabpanel")
      .attr("labelledby", (d) => d.name + "-tab");

    varEditor.exit().remove();

    varTabs
      .selectAll("div.variableEditField")
      .data((d) => d)
      .enter()
      .append("div")
      .attr("class", "variableEditField")
      .attr("id", (d) => `variableEditField-${d.name}`);

    const varTabContent = varTabs.selectAll("div.variableEditField").data(
      (d) => [d],
      (d) => d.name
    );

    varTabContent
      .enter()
      .append("div")
      .attr("class", "variableEditField")
      .each((d, i, nodes) => d.addEditor(nodes[i], settings));

    varTabContent.exit().remove();
  }

  static remButton(selection) {
    selection
      .append("button")
      .attr("class", "btn btn-danger m-1 py-0")
      .append("i")
      .attr("class", "fas fa-minus-circle");
  }

  static plusButton(selection) {
    selection
      .append("button")
      .attr("class", "btn btn-success m-1 py-0")
      .append("i")
      .attr("class", "fas fa-plus-circle");
  }

  static launchConcordance(settings) {
    d3.select("#start").classed("show active", false);
    d3.select("#start-tab").classed("active", false);
    d3.selectAll("#settings").classed("active", true);
    d3.select("#settings-tab")
      .selectAll("div.tab-pane")
      .classed("show active", true);
    d3.select("#nav-conc").classed("show active", true);
    d3.select("#nav-conc-tab").classed("active", true);

    this.editConcordances(settings);
  }
  static editConcordances(settings) {
    this.listConcordances(settings.annotations);

    const concs = d3
      .select("#showConcordances")
      .selectAll("div.card")
      .data(settings.annotations, (d) => d);

    concs
      .enter()
      .append("div")
      .attr("class", "card")
      .attr("id", (d) => `${d.type}-conc-edit`)
      .each((d, i, nodes) => d.fillConcCard(nodes[i], settings))
      .merge(concs);

    concs.exit().remove();
  }

  static listConcordances(annotations) {
    const concList = d3
      .select("#concFiles")
      .selectAll(".nav-link")
      .data(annotations, (d) => d.type);

    concList
      .enter()
      .append("a")
      .merge(concList)
      .attr("class", "nav-link concView")
      .attr("id", (d) => d.type + "-view-tab")
      .attr("href", (d) => "#" + d.type + "-view")
      .attr("aria-controls", (d) => d.type)
      .classed("active", (d) => annotations.indexOf(d) === 0)
      .text((d) => d.type)
      .style("font-weight", "bold")
      .on("click", (d) => {
        d3.selectAll(".concView").classed("active", (dd) => dd.type === d.type);
        d3.select("#concView")
          .selectAll("div.tab-pane")
          .filter(".concFrame")
          .classed("show active", (dd) => dd.type === d.type);
      });

    concList.exit().remove();

    this.concViewer(annotations);
  }

  static concViewer(annotations) {
    console.log(annotations)
    d3
      .select("#concView")
      .selectAll(".concFrame")
      .data(annotations, (d) => d)
      .join(
        function(enter) {
          return enter.append("div")
          .attr("class", "tab-pane fade concFrame")
          .attr("id", (d) => d.type + "-view")
          .attr("role", "tabpanel")
          .attr("labelledby", (d) => d.type + "-view-tab")
          .each((d, i, nodes) => {
            d.setUpConcordance(nodes[i]);
        });
        },
        function(update) {
          return update.each((d, i, nodes) => {
              d.setUpConcordance(nodes[i]);
          });
      },
        function(exit) {
          return exit.remove();
        }
      ).classed("show active", (d) =>
      d3.select("#" + d.type + "-view-tab").classed("active")
  );
      
    annotations.forEach((ann) => ann.displayLine());
  }
}
