const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // Thermal Printer APIs
  detectPrinters: () => ipcRenderer.invoke('detect-printers'),
  testThermalPrint: (printerName) => ipcRenderer.invoke('test-thermal-print', printerName),
  printThermalReceipt: (receiptData) => ipcRenderer.invoke('print-thermal-receipt', receiptData),
});
