class Settings {
  constructor() {
    this.projectName = "AnnotationProject";
    this.variables = [];
    this.annotations = [];
    this.file = this.projectName + ".config";

    UserInterface.listVariables(this);
  }

  set filename(file) {
    this.file = file;
  }
  defaultVarName(type, testName = "", i = 1) {
    const currentNames = this.variables.map((d) => d.name);
    testName =
      testName === ""
        ? `new${type.charAt(0).toUpperCase()}${type.slice(1)}${i}`
        : testName;
    if (currentNames.indexOf(testName) !== -1) {
      return this.defaultVarName(type, "", i + 1);
    } else {
      return testName;
    }
  }

  removeVariable(variable) {
    this.variables = this.variables.filter((v) => v.name !== variable.name);
    UserInterface.listVariables(this);
  }

  save() {
    return {
      projectName: this.projectName,
      variables: [...this.variables].map((v) => v.toFile),
      annotations: this.annotations.map((ann) => ann.toFile),
    };
  }
  saveAnnotation() {
    if (this.annotations.length === 1) {
      return this.exportConcordance(this.annotations);
    } else {
      const types = this.annotations.map((d) => d.type);
      types.push("All the concordances");
      Sw.exportConcordances(types).then((result) => {
        const toSave =
          result.value === "All the concordances"
            ? this.annotations
            : this.annotations.map((d) => d.type == result.value);
        return this.exportConcordance(toSave);
      });
    }
  }

  exportConcordance(annotations) {
    const concordances = annotations.map((ann) => ann.tabulate()).flat();
    const colNames = [
      ...new Set(
        concordances.map((token) => Object.getOwnPropertyNames(token)).flat()
      ),
    ];
    const final_output = concordances.map((token) => {
      return colNames
        .map((col) => (token[col] !== undefined ? token[col] : ""))
        .join("\t");
    });

    return [colNames.join("\t"), ...final_output].join("\n");
  }
  subload(fileData) {
    const { file, content } = fileData;
    this.file = file;
    this._tmp = JSON.parse(content);
    if (Object.keys(this._tmp).indexOf("projectName") === -1) {
      Sw.notSettings();
    } else {
      const conc_files = this._tmp.annotations.map((ann, i) => [
        `c${i}`,
        ann.file,
      ]);
      const var_files = this._tmp.variables
        .filter((v) => v.type === "categorical")
        .map((v) => [`v${this._tmp.variables.indexOf(v)}`, v.file]);
      this.toLoad = [...conc_files, ...var_files];
      this.gradualOpening();
    }
  }
  async gradualOpening() {
    let [position, filename] = this.toLoad.pop();
    let index = position.slice(1);
    let file = await window.electronAPI.readFile(filename);
    let { content } = file;
    if (position.startsWith("c")) {
      this._tmp.annotations[index].text = d3.tsvParse(content);
    } else {
      this._tmp.variables[index].values = JSON.parse(content).values;
    }
    this.toLoad.length === 0 ? this.load() : this.gradualOpening();
  }

  load() {
    this.variables = this._tmp.variables.map((v, i) => {
      const matchingVar = UserInterface.variableTypes.filter(
        (t) => t.name === v.type
      )[0];
      const newVar = new matchingVar.class();
      newVar.name = v.name;
      if (v.type === "categorical") {
        newVar.values = v.values;
        newVar.hasAttributes = v.hasAttributes;
      } else if (v.type === "confidence") {
        newVar.range = v.range;
      }
      return newVar;
    });
    this.annotations = this._tmp.annotations.map((ann) => {
      ann.variables = ann.variables.map((annvar) => {
        return this.variables.filter((setvar) => setvar.name === annvar)[0];
      });

      const conc = new Annotation(ann);
      conc.text.forEach((token) =>
        token.fromFile(ann.annotation[token.id], ann.variables)
      );
      return conc;
    });
    this.projectName = this._tmp.projectName;
    d3.select("#projectName").text(this.projectName);
    delete this._tmp;

    UserInterface.listVariables(this);
    UserInterface.launchConcordance(this);
  }

  loadConc(files) {
    files.forEach((file) => {
      const ann = new Annotation({
        file: file.file,
        type: file.basename.split(".")[0],
        text: d3.tsvParse(file.content),
      });
      this.annotations.push(ann);
    });
    UserInterface.launchConcordance(this);
  }
  askSave() {
    Sw.askSave().then(async (result) => {
      if (result.value) {
        if (result.value === "settings") {
          this.file = await window.electronAPI.saveFile(
            FileManager.saveJsonOptions(this.file),
            JSON.stringify(this.save())
          );
        } else {
          this.concfile = await window.electronAPI.saveFile(
            FileManager.saveTsvOptions(this.projectName),
            this.saveAnnotation()
          );
        }
      }
    });
  }
}
