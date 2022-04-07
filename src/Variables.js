class Variable {
  constructor() {}

  remove(settings) {
    Sw.removeVariable().then((result) => {
      if (result.isConfirmed) {
        settings.removeVariable(this);
      } else {
        return;
      }
    });
  }

  listConcordances(settings) {
    const concList = this.main
      .append("span")
      .attr("class", "btn-group-toggle")
      .attr("data-toggle", "buttons")
      .selectAll("button")
      .data(
        settings.annotations,
        (d) => d,
        (d) => d.type
      );

    concList
      .enter()
      .append("button")
      .attr("id", (d) => `${this.name}-editor-${d.type}`)
      .each((d, i, nodes) => {
        settings.annotations[i].varEditor(concList, nodes[i], this, settings);
      });

    concList.exit().remove();
  }

  addFooter(settings) {
    const footer = this.editField
      .append("footer")
      .attr("class", "rightmost")
      .append("div")
      .attr("class", "btn-group btn-group-lg")
      .attr("role", "group")
      .attr("aria-label", "editorFooter");

    footer
      .append("button")
      .attr("class", "btn btn-danger my-1 py-0")
      .attr("id", "discardData")
      .text("Reset changes ")
      .on("click", () => UserInterface.variablesEditor(settings))
      .append("i")
      .attr("class", "fas fa-eraser mx-1");

    footer
      .append("button")
      .attr("class", "btn btn-success my-1 py-0")
      .attr("id", "saveData")
      .text("Save changes")
      .on("click", () => this.saveChanges(settings))
      .append("i")
      .attr("class", "fas fa-save mx-1");
  }

  saveChanges(settings) {
    const which_var = settings.variables.indexOf(this);
    const which_conc = settings.annotations.map((ann) =>
      ann.variables.indexOf(this)
    );
    this.name = this.header.select(`#${this.name}-title`).html();

    if (this.type === "categorical" || this.type === "confidence") {
      this.update();
    }

    which_var === -1
      ? settings.variables.push(this)
      : (settings.variables[which_var] = this);

    which_conc.forEach((varIndex, concIndex) => {
      if (varIndex > -1)
        settings.annotations[concIndex].variables[varIndex] = this;
    });

    UserInterface.listVariables(settings);
  }

  addEditor(editField, settings) {
    this.editField = d3.select(editField);

    this.header = this.editField
      .append("header")
      .attr("class", "variableTitle");
    this.header
      .append("div")
      .attr("contenteditable", "true")
      .attr("id", this.name + "-title")
      .text(this.name)
      .each(
        (d, i, nodes) =>
          (nodes[i].onkeyup = () => {
            this.name = d3.select(nodes[i]).html();
          })
      );

    this.header
      .append("div")
      .call(UserInterface.remButton)
      .attr("class", "removeVar")
      .on("click", () => this.remove(settings));

    this.main = this.editField.append("main").style("padding", "10px");

    this.main.append("h5").text("Active for concordance files:");
    this.listConcordances(settings);

    if (this.type === "categorical" || this.type === "confidence") {
      this.editor();
    }

    this.addFooter(settings);
  }

  add(settings) {
    settings.variables.push(this);
    console.log(settings.variables);
  }
}

class CategoricalVariable extends Variable {
  constructor() {
    super();
    this.type = "categorical";
    this.values = {
      defaultLemma: CategoricalVariable.defValues,
    };
    this.instruction = "Click on the right button to select the value of ";
    this.hasAttributes = [];
  }

  fromFile(settings) {
    CategoricalVariable.load().then((fileContents) => {
      const { file, content, basename } = fileContents;
      const { values, hasAttributes } = JSON.parse(content);

      if (values === undefined) {
        Sw.invalidCategorical().then((result) => {
          if (result.isConfirmed) this.fromFile(settings);
        });
      }
      this.file = file;
      this.values = values;
      this.hasAttributes = hasAttributes;
      this.name = basename.split(".")[0];
      this.checkName(settings);
      this.add(settings);
    });
  }
  create(settings) {
    Sw.createCategorical().then((result) => {
      if (result.value === "load") {
        this.fromFile(settings);
      } else {
        this.name = "";
        this.checkName(settings);
        this.add(settings);
      }
    });
  }
  checkName(settings) {
    console.log(this.name);
    const currentNames = settings.variables.map((d) => d.name);
    if (this.name === "" || currentNames.indexOf(this.name) > -1) {
      $("#newVariableModal").modal("hide");
      Sw.nameCategorical(currentNames).then((result) => {
        this.name = result.value
          ? result.value
          : settings.defaultVarName("categorical", this.name);
        $("#newVariableModal").modal("show");
      });
    }
  }

  update() {
    this.values = { ...this._values };
    this.export();
  }

  async export() {
    const toSave = {
      type: this.type,
      name: this.name,
      values: this.values,
      hasAttributes: this.hasAttributes,
    };
    this.file = await window.electronAPI.saveFile(
      FileManager.saveJsonOptions(this.name),
      JSON.stringify(toSave)
    );
  }
  static async load() {
    const files = await window.electronAPI.openFile("json");
    return files[0];
  }
  static defValues = [
    { label: "", code: "" },
    { label: "", code: "" },
    { label: "", code: "" },
  ];

  editor() {
    this.main.append("hr");
    this.main.append("h5").text("Edit variable");

    this.catEditor = this.main
      .append("div")
      .attr("id", "categoricalEditor-" + this.name);
    this.addCatEditor();

    this.main
      .append("div")
      .attr("class", "rightmost")
      .append("span")
      .html("Add set of values linked to a lemma")
      .call(() => UserInterface.plusButton)
      .on("click", () => this.addCatEditor());
  }
  addCatEditor() {
    this._values = { ...this.values };
    const catEditors = this.catEditor
      .selectAll("div.catEditor")
      .data(d3.keys(this.values));

    catEditors
      .enter()
      .append("div")
      .attr("class", "catEditor")
      .attr("id", (lemma) => `${this.name}-for-${lemma}`)
      .each((lemma, lemmaIndex, catEditorsList) =>
        this.variableAdder(lemma, catEditorsList[lemmaIndex])
      );

    catEditors.exit().remove();
  }

  variableAdder(lemma, selection) {
    const table = d3
      .select(selection)
      .append("div")
      .attr("class", "table table-responsive")
      .append("table");

    const caption = table.append("caption").html("For -> ");

    caption
      .append("span")
      .attr("contentEditable", "true")
      .style("font-style", "italic")
      .attr("id", `${this.name}-${lemma}-lemma`)
      .html(lemma);

    caption
      .append("span")
      .call(UserInterface.remButton)
      .on("click", () => d3.select(`#${this.name}-for-${lemma}`).remove());

    table
      .append("thead")
      // .attr("class", "thead-dark")
      .append("tr")
      .attr("class", "table-primary")
      .selectAll("th")
      .data(["Label", "Code", "-"])
      .enter()
      .append("th")
      .text((d) => d);

    const tbody = table.append("tbody");
    this.listValues(tbody, lemma);

    d3.select(selection)
      .append("div")
      .attr("class", "rightmost")
      .append("span")
      .html("Add values")
      .call(UserInterface.plusButton)
      .on("click", () => {
        this._values[lemma].push({ label: "", code: "" });
        this.listValues(tbody, lemma);
      });

    d3.select(selection).append("hr");
  }

  listValues(tbody, lemma) {
    const allCells = tbody
      .selectAll("tr")
      .data(this._values[lemma], (d) => d)
      .join("tr")
      .attr("id", (d) => `${d.code}-${lemma}`)
      .selectAll("td")
      .data((d, i) =>
        ["label", "code", "remove"].map((k) => {
          return {
            name: k,
            value: d[k],
            i: i,
          };
        })
      )
      .enter()
      .append("td")
      .attr("data-th", (d) => d.name)
      .attr("contenteditable", (d) => (d.name === "remove" ? null : true))
      .attr("id", (d) => `${this.name}-${lemma}-${d.name}-${d.i}`)
      .html((d) => d.value);

    allCells
      .filter((d) => d.name != "remove")
      .each(
        (d, i, nodes) =>
          (nodes[i].onkeyup = () => {
            this._values[lemma][d.i][d.name] = d3.select(nodes[i]).html();
            console.log(this._values[lemma]);
          })
      );

    allCells
      .filter("[data-th='remove']")
      .call(UserInterface.remButton)
      .on("click", (d) => {
        this._values[lemma].splice(d.i, 1);
        this.listValues(tbody, lemma);
      });
  }

  appendTask(selection, token) {
    selection
      .append("div")
      .attr("class", "btn-group-vertical btn-group-toggle mt-2 btn-block")
      .attr("data-toggle", "buttons")
      .selectAll("label")
      .data(
        Object.keys(this.values).indexOf(token.lemma) === -1
          ? this.values["defaultLemma"]
          : token.lemma
      )
      .join("label")
      .attr("class", "btn btn-outline-secondary catButton")
      .each((d, i, nodes) => this.addCatButton(nodes[i], token));
  }

  addCatButton(selection, token) {
    const label = d3.select(selection);
    label
      .classed("active", (d) => token.checkAnnotation(this) === d.code)
      .append("input")
      .attr("type", "radio")
      .attr("autocomplete", "off")
      .attr("name", `${this.name}-${token.lemma}-cat`)
      .attr("id", (d) => d.code)
      .attr("value", (d) => d.code)
      .property(
        "checked",
        (d) => token.checkAnnotation(this) === d.code || undefined
      )
      .each(
        (d, i, nodes) =>
          (nodes[i].onchange = () => {
            token.annotate(this, d.code);
          })
      );
    label.append("text").text((d) => d.label);
  }

  get toFile() {
    return {
      name: this.name,
      type: this.type,
      file: this.file,
      hasAttachments: this.hasAttachments,
    };
  }
}

class Cues extends Variable {
  constructor() {
    super();
    this.type = "cues";
    this.index = "id";
    this.instruction = "Click on context words for ";
  }

  get toFile() {
    return {
      type: this.type,
      name: this.name,
    };
  }

  appendTask(selection, token) {
    selection
      .append("div")
      .attr("class", "btn-group-toggle")
      .attr("data-toggle", "buttons")
      .selectAll("button")
      .data(token.cues)
      .enter()
      .append("button")
      .attr("class", (d) => (d.i === 0 ? "target" : "btn btn-cues px-1"))
      .classed("active", (d) => token.checkAnnotation(this, d.i))
      .text((d) => d.cw)
      .attr("value", (d) => d.i)
      .each(
        (d, i, nodes) =>
          (nodes[i].onclick = () => {
            token.annotate(this, d.i);
            d3.select(nodes[i]).classed("active", () => {
              return !token.checkAnnotation(this, d.i);
            });
          })
      );
  }
}

class Input extends Variable {
  constructor() {
    super();
    this.type = "input";
    this.instruction = "Fill in the box for ";
  }

  get toFile() {
    return {
      type: this.type,
      name: this.name,
    };
  }

  appendTask(selection, token) {
    selection
      .append("div")
      .style("justify-content", "left")
      .append("input")
      .attr("class", "form-control")
      .attr("name", "comments")
      .attr("autocomplete", "on")
      .attr(
        "placeholder",
        token.checkAnnotation(this) || "Instert your text here"
      )
      .attr("value", token.checkAnnotation(this))
      .attr("aria-label", "Comments")
      .each(
        (d, i, nodes) =>
          (nodes[i].onchange = () => token.annotate(this, nodes[i].value))
      );
  }
}

class Numeric extends Variable {
  constructor() {
    super();
    this.type = "numeric";
    this.instruction = "Fill in a number for ";
  }

  get toFile() {
    return {
      type: this.type,
      name: this.name,
    };
  }

  appendTask(selection, token) {
    selection
      .append("input")
      .attr("type", "number")
      .attr("value", token.checkAnnotation(this))
      .each((d, i, nodes) => {
        nodes[i].onchange = () =>
          token.annotate(this, parseInt(nodes[i].value));
      });
  }
}
class Confidence extends Variable {
  constructor() {
    super();
    this.type = "confidence";
    this.range = {
      min: 0,
      max: 7,
    };
    this.instruction = "Click on the right star to rate ";
  }

  get toFile() {
    return {
      type: this.type,
      name: this.name,
      range: { ...this.range },
    };
  }

  update() {
    const newRange = this.confEditor.selectAll("input").nodes();
    console.log(newRange.map((x) => x.value));
    this.range.min = parseInt(newRange[0].value);
    this.range.max = parseInt(newRange[1].value);
  }
  editor() {
    this.main.append("hr");
    const confEditor = this.main
      .append("div")
      .attr("class", "input-group mb-3")
      .attr("id", "confEditor-" + this.name);
    confEditor
      .append("div")
      .attr("class", "input-group-prepend")
      .append("span")
      .attr("class", "input-group-text")
      .text("Starting value");
    confEditor
      .append("input")
      .style("width", "50px")
      .attr("type", "number")
      .attr("value", this.range.min);
    confEditor
      .append("input")
      .style("width", "50px")
      .attr("type", "number")
      .attr("value", this.range.max);
    confEditor
      .append("div")
      .attr("class", "input-group-append")
      .append("span")
      .attr("class", "input-group-text")
      .text("Greatest value");
  }

  get rangeValues() {
    const between = this.range.max - this.range.min;
    return [...Array(between).keys()].map((i) => i + this.range.min);
  }

  appendTask(selection, token) {
    const conf = selection
      .append("div")
      .attr("class", "starField")
      .append("div")
      .attr("class", "btn-group-toggle")
      .attr("data-toggle", "buttons");

    conf.append("span").attr("class", "px-2").text("Minimum");

    conf
      .selectAll("button")
      .data(this.rangeValues)
      .enter()
      .append("button")
      .attr("class", "btn btn-sm confstar")
      .style("font-size", "1.5em")
      .attr("value", (d) => d)
      .on("click", (d) => {
        token.annotate(this, d);
        conf
          .selectAll("button")
          .selectAll("i")
          .attr("class", (dd) =>
            dd <= token.checkAnnotation(this) ? "fas" : "far"
          );
      })
      .append("i")
      .attr("class", (d) => {
        return token.checkAnnotation(this) !== null &&
          d <= token.checkAnnotation(this)
          ? "fas"
          : "far";
      })
      .html("&#xf005;");

    conf.append("span").attr("class", "px-2").text("Maximum");
  }
}
