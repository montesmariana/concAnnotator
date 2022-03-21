class FileManager {
  static saveTsvOptions(filename) {
    // "title":  msg["progress_save"],
    return {
      title: "Save as TSV",
      defaultPath: filename + ".tsv",
      filters: [
        {
          name: "TSV",
          extensions: ["tsv", "txt", "csv"],
        },
      ],
    };
  }

  static saveJsonOptions(defaultPath) {
    return {
      title: "Save as JSON",
      defaultPath: defaultPath + ".json",
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    };
  }

  static async readMany(filesList) {
    return await filesList.map(async (f) => {
      const output = await window.electronAPI.readFile(f[1]);
      return [f[0], output];
    });
  }

  static saveFile(content, filename) {
    window.electronAPI.writeFile(
      filename,
      content.endsWith(".json") ? JSON.stringify(content) : content
    );
  }
}
