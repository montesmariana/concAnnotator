class Workspace {
  constructor() {}

  static fillAnnotation(selection, data) {
    const ann = d3.select(selection);
    const { variable, token, i } = data;
    ann
      .append("p")
      .attr("class", "instruction")
      .html(`${i + 1}. ${variable.instruction} <em>${variable.name}</em>`);

    ann
      .append("div")
      .attr("class", "taskField")
      .attr("type", `${variable.type}-task`);

    variable.appendTask(ann, token);

    ann.append("hr");
  }
}
