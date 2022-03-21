class ConcordanceLine {
  _variables = [];
  _annotation = new tokenNotes();
  constructor(line, columnMapping) {
    line = ConcordanceLine.mapColumns(line, columnMapping);
    this.left = line.left;
    this.target = line.target;
    this.right = line.right;
    this.id = line.id;
  }

  static mapColumns(line, columnMapping) {
    Object.keys(columnMapping).forEach(
      (role) => (line[role] = line[columnMapping[role]])
    );

    return line;
  }

  styleTarget() {
    d3.select(`#target-${this.id.replaceAll("/", "-")}`).style("color", () => {
      if (this._annotation.variables.length > 0) {
        if (this._annotation.isComplete(this._variables)) {
          return "#27ae60";
        } else {
          return "#FFC300";
        }
      }
    });
  }

  printOverview(node, concordance) {
    let line = d3.select(node);
    line
      .append("div")
      .attr("class", "leftText")
      .append("p")
      .attr("class", "text-sm-right")
      .text((d) => d.left);

    line
      .append("div")
      .attr("class", "centerText")
      .append("p")
      .attr("id", `target-${this.id.replaceAll("/", "-")}`)
      .attr("class", "text-sm-center")
      .style("font-weight", "bold")

      .text((d) => d.target)
      .style("cursor", "pointer")
      .on("click", () => {
        d3.select(`#${concordance.type}-Annotation-tab`).node().click();
        concordance.displayed = concordance.text.indexOf(this);
        concordance.displayLine();
      });
    this.styleTarget();
    line
      .append("div")
      .attr("class", "rightText")
      .append("p")
      .attr("class", "text-sm-left")
      .text((d) => d.right);
  }

  addVariable(variable) {
    this._variables.push(variable.name);
    this.styleTarget();
  }
  removeVariable(variable) {
    this._variables = this._variables.filter((v) => v != variable.name);
    this.styleTarget();
  }

  get leftCues() {
    return this.left
      .trim()
      .split(" ")
      .map((d, i) => {
        const varIdx = this.left.split(" ").length - i - 1;
        return { i: "L" + varIdx, cw: d };
      });
  }

  get rightCues() {
    return this.right
      .trim()
      .split(" ")
      .map((d, i) => {
        return { i: "R" + (i + 1), cw: d };
      });
  }

  get targetCue() {
    return { i: 0, cw: this.target };
  }

  get cues() {
    return [...this.leftCues, this.targetCue, ...this.rightCues];
  }

  set setLemma(value) {
    this.lemma = value;
  }

  get print() {
    const keys = Object.getOwnPropertyNames(this).filter(
      (x) => !x.startsWith("_")
    );
    const values = Object.fromEntries(keys.map((key) => [key, this[key]]));
    const notes = this._annotation.notes;
    return { ...values, ...notes };
  }

  annotate(variable, value) {
    if (variable.type === "cues") {
      this._annotation.updateList(variable.name, value);
    } else {
      this._annotation.annotate(variable.name, value);
    }
    this.styleTarget();
  }

  checkAnnotation(variable, value = null) {
    if (variable.type === "cues") {
      return this._annotation.checkList(variable.name, value);
    } else {
      return this._annotation.checkAnnotation(variable.name);
    }
  }

  fromFile(token_ann, variables) {
    if (token_ann !== undefined) {
      Object.keys(token_ann).forEach((varName) => {
        const variable = variables.filter((v) => v.name == varName)[0];
        if (variable.type === "cues") {
          token_ann[varName].forEach((c) => this.annotate(variable, c));
        } else {
          this.annotate(variable, token_ann[varName]);
        }
      });
    }
  }
}

class tokenNotes {
  constructor() {}

  annotate(variable, value) {
    this[variable] = value;
    console.log(this);
  }

  updateList(variable, element) {
    if (this[variable] === undefined) {
      // if we have not registed the variable yet
      this[variable] = [element];
    } else if (this[variable].indexOf(element) === -1) {
      // if we have registered the variable but the element is not present
      this[variable].push(element);
    } else if (this[variable].length === 1) {
      // if the element is present and the only member
      delete this[variable];
    } else {
      // if the element is one of many others
      this[variable] = this[variable].filter((d) => d !== element);
    }
  }

  checkAnnotation(variable) {
    return this[variable] || null;
  }

  checkList(variable, element) {
    return this[variable] !== undefined && this[variable].indexOf(element) > -1;
  }

  get notes() {
    const keys = Object.getOwnPropertyNames(this);
    return Object.fromEntries(keys.map((key) => [key, this[key]]));
  }

  get variables() {
    return Object.getOwnPropertyNames(this);
  }

  isComplete(variables) {
    return (
      variables.filter((v) => this.variables.indexOf(v) > -1).length ===
      variables.length
    );
  }
}
