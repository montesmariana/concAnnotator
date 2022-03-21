class Sw {
  constructor() {}

  static mapColumns(columns, role) {
    return Swal.fire({
      title: `Which column represents the "${role}"?`,
      input: "select",
      inputOptions: columns,
      showCancelButton: true,
      cancelButtonText: "None, never mind",
    });
  }

  static selectLemmaColumn(input) {
    return Swal.fire({
      title: "Which column has indicates the lemma?",
      input: "select",
      inputOptions: input,
      inputPlaceholder: "Choose a column",
      showCancelButton: true,
      cancelButtonText: "None, never mind",
    });
  }

  static askSave() {
    return Swal.fire({
      title: "What would you like to save?",
      input: "select",
      inputOptions: { settings: "Settings", conc: "Annotation" },
      showCancelButton: true,
    });
  }

  static notSettings() {
    return Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "This is not a Settings File!",
      confirmButtonText: "Try again",
    });
  }

  static exportConcordances(input) {
    return Swal.fire({
      title: "Which concordance would you like to export?",
      input: "select",
      inputOptions: input,
      showCancelButton: true,
    });
  }

  static createCategorical() {
    return Swal.fire({
      title: "Do you want to load from file or create it from scratch?",
      input: "radio",
      inputOptions: {
        load: "Load a file",
        create: "Create a new one",
      },
      inputValidator: (value) => {
        if (!value) {
          return "You need to choose something!";
        }
      },
    });
  }

  static removeVariable() {
    return Swal.fire({
      title: "Are you sure you want to remove this variable?",
      icon: "Warning",
      showCancelButton: true,
      confirmButtonText: "YES",
      cancelButtonText: "Sorry, no!",
    });
  }

  static nameCategorical(currentNames) {
    return Swal.fire({
      title: "What's the name of your new variable?",
      input: "text",
      inputPlaceholder: "newCategorical",
      inputValidator: (value) => {
        if (currentNames.indexOf(value) !== -1) {
          return "Sorry, already taken!";
        }
      },
    });
  }

  static invalidCategorical() {
    return Swal.fire({
      title: "Invalid format. There is no 'values' attribute.",
      denyButtonText: "Never mind",
      confirmButtonText: "Try again",
    });
  }
}
