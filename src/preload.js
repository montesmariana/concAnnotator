const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: (options) => ipcRenderer.invoke("dialog:openFile", options),
  saveFile: (options, content) =>
    ipcRenderer.invoke("dialog:saveFile", options, content),
  readFile: (filePath) => ipcRenderer.invoke("readFile", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("writeFile", filePath, content),
  //   openTSV: () => ipcRenderer.invoke("open:tsv"),
  //   openJSON: (filename = null) => ipcRenderer.invoke("open:json", filename),
  //   saveTSV: (content, filename, title = "Store as TSV") =>
  //     ipcRenderer.invoke("save:tsv", content, filename, title),
  //   saveJSON: (content, defaultPath, title = "Store as JSON") =>
  //     ipcRenderer.invoke("save:json", content, defaultPath, title),
});
