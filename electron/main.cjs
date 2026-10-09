const { app, BrowserWindow, session, ipcMain } = require("electron");
const { pathToFileURL } = require("node:url");
const { registerMachineIpc } = require("./devices/ipc.cjs");
const path = require("node:path");
const isDev = process.argv.includes("--dev");
// Branding must not move the existing Hopper workspace. Explicit test/custom
// profiles continue to use Electron's --user-data-dir switch.
if (!app.commandLine.hasSwitch("user-data-dir")) {
  app.setPath("userData", path.join(app.getPath("appData"), "hopper-studio"));
}
app.setName("Mantis Studio");
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  const window = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1100,
    minHeight: 740,
    title: "Mantis Studio",
    backgroundColor: "#f8f9f6",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../dist/mantis.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  const entry = path.join(__dirname, "../dist/index.html");
  registerMachineIpc(
    ipcMain,
    window,
    isDev ? "http://127.0.0.1:5173/" : pathToFileURL(entry).href,
  );
  if (isDev) window.loadURL("http://127.0.0.1:5173/");
  else window.loadFile(entry);
});
app.on("window-all-closed", () => app.quit());
