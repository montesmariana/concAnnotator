const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require("electron-squirrel-startup")) {
//   // eslint-disable-line global-require
//   app.quit();
// }

async function handleFileOpen(event, filetype) {
  let options;
  if (filetype === "json") {
    options = {
      // title: msg['upload_file'],
      title: "Open JSON file",
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    };
  } else {
    options = {
      // title: msg['upload_files'],
      title: "Choose concordance file(s)",
      filters: [
        { name: "Tab separated values", extensions: ["tsv"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["multiSelections"],
    };
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(
    (options = options)
  );
  if (canceled) {
    return;
  } else {
    return filePaths.map((filePath) => handleFileRead(event, filePath));
  }
}
function handleFileRead(event, filePath) {
  const toReturn = {
    file: filePath,
    content: fs.readFileSync(filePath, "utf8"),
    basename: path.basename(filePath),
  };
  return toReturn;
}
async function handleFileSave(event, options, content) {
  const { canceled, filePath } = await dialog.showSaveDialog(
    (options = options)
  );
  if (canceled) {
    return;
  } else {
    return handleFileWrite(event, filePath, content);
  }
}
function handleFileWrite(event, filePath, content) {
  fs.writeFile(filePath, content, function (err) {
    if (err) throw err;
  });
  return filePath;
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "src", "preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleFileOpen);
  ipcMain.handle("dialog:saveFile", handleFileSave);
  ipcMain.handle("readFile", handleFileRead);
  ipcMain.handle("writeFile", handleFileWrite);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
