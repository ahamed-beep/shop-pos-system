const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
//User data path, usually in C:/Users/username/AppData/Roaming/mobile-pos-system
const userDataPath = app.getPath('userData');
process.env.APP_USER_DATA = userDataPath;

const { startServer, shutdownServer } = require('../server/index');

let mainWindow;
let serverStarted = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}


function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false, 
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../pos-frontend/public/logo.png'), 
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // after server is ready
  const loadContent = () => {
    if (app.isPackaged) {
      mainWindow.loadFile(path.join(__dirname, '../pos-frontend/dist/index.html'));
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
    mainWindow.once('ready-to-show', () => mainWindow.show());
  };

  if (!app.isPackaged) {
    loadContent(); 
  } else {

    const checkServer = async () => {
      const http = require('http');
      const interval = setInterval(() => {
        http.get('http://127.0.0.1:3000/health', (res) => {
          if (res.statusCode === 200) {
            clearInterval(interval);
            loadContent();
          }
        }).on('error', () => {
          console.log('Waiting for server...');
        });
      }, 200);

      setTimeout(() => clearInterval(interval), 10000);
    };
    checkServer();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServerOnce() {
  if (serverStarted) return;
  serverStarted = true;
  startServer(3000);
}

function createCustomMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Print Receipt', accelerator: 'CmdOrCtrl+P' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'License',
      submenu: [
        {
          label: 'View License Status',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                window.location.hash = '#/Dashboard/settings';
              `);
            }
          }
        },
        {
          label: 'Activate License',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                window.location.hash = '#/license-activation';
              `);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'License Information',
          click: () => {
            dialog.showMessageBox({
              title: 'License Information',
              message: 'Enterprise POS Engine License',
              detail: 'This software uses a hardware-locked license system.\n\n' +
                '• Trial Period: 7 days\n' +
                '• Multi-device activation supported\n' +
                '• Contact support for license purchase\n\n' +
                'Email: rabijamil8@gmail.com\n' +
                'WhatsApp: +92 309 4053841',
              buttons: ['OK']
            });
          }
        }
      ]
    },
    {
      label: 'Support',
      submenu: [
        {
          label: 'Email Support',
          click: () => shell.openExternal(
            'mailto:rabijamil8@gmail.com?subject=POS%20Support'
          )
        },
        {
          label: 'WhatsApp',
          click: () => shell.openExternal(
            'https://wa.me/923094053841'
          )
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              title: 'Enterprise POS Engine',
              message: 'Enterprise POS Engine v0.5.0',
              detail: 'Developed by Muhammad Rabee\n\n' +
                'A complete point-of-sale solution with:\n' +
                '• Inventory Management\n' +
                '• Sales Reporting\n' +
                '• Multi-user Support\n' +
                '• Hardware-locked Licensing\n\n' +
                '© 2026 Muhammad Rabee. All rights reserved.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  startServerOnce();
  createCustomMenu();
});
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('toggle-devtools', () => {
  if (mainWindow) mainWindow.webContents.toggleDevTools();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let isQuitting = false;
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    console.log('Performing final auto-backup before exit...');
    await shutdownServer();
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  const fs = require('fs');
  fs.writeFileSync(
    path.join(userDataPath, 'fatal.log'),
    err.stack
  );
});

const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

ipcMain.handle('detect-printers', async () => {
  try {
    console.log('[Electron] Detecting thermal printers...');

    const printers = mainWindow.webContents.getPrintersAsync ?
      await mainWindow.webContents.getPrintersAsync() :
      mainWindow.webContents.getPrinters();

    console.log('[Electron] System printers found:', printers.length);

    const thermalKeywords = ['pos', 'thermal', 'receipt', 'xprinter', 'epson', 'star', 'bixolon', 'citizen'];
    const thermalPrinters = printers.filter(printer => {
      const name = printer.name.toLowerCase();
      return thermalKeywords.some(keyword => name.includes(keyword));
    });

    console.log('[Electron] Thermal printers detected:', thermalPrinters.length);

    return {
      success: true,
      printers: printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        status: p.status || 'unknown',
        isDefault: p.isDefault,
        isThermal: thermalKeywords.some(keyword => p.name.toLowerCase().includes(keyword))
      }))
    };
  } catch (error) {
    console.error('[Electron] Error detecting printers:', error);
    return {
      success: false,
      error: error.message,
      printers: []
    };
  }
});

ipcMain.handle('test-thermal-print', async (event, printerName) => {
  try {
    console.log('[Electron] Test print requested for:', printerName);

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      characterSet: 'PC437_USA',
      removeSpecialCharacters: false,
      lineCharacter: "="
    });

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println('MPOSE SYSTEM');
    printer.bold(false);
    printer.newLine();
    printer.println('Test Print Successful');
    printer.drawLine();
    printer.leftRight('Printer:', printerName);
    printer.leftRight('Status:', 'Connected');
    printer.drawLine();
    printer.alignCenter();
    printer.println('This is a test receipt');
    printer.newLine();
    printer.cut();

    await printer.execute();
    console.log('[Electron] Test print executed successfully');

    return { success: true, message: 'Test print successful' };
  } catch (error) {
    console.error('[Electron] Test print error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-thermal-receipt', async (event, receiptData) => {
  try {
    console.log('[Electron] Printing thermal receipt...');

    const { printerName, config, receipt } = receiptData;

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: printerName ? `printer:${printerName}` : 'printer:Auto',
      characterSet: 'PC437_USA',
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: config?.paper_width || 58
    });

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(receipt.shopName || 'MPOSE SYSTEM');
    printer.bold(false);
    printer.setTextNormal();

    if (receipt.shopAddress) {
      printer.println(receipt.shopAddress);
    }
    if (receipt.shopPhone) {
      printer.println(`Tel: ${receipt.shopPhone}`);
    }

    printer.drawLine();

    // Invoice info
    if (receipt.showInvoice && receipt.invoiceNo) {
      printer.leftRight(`Invoice: ${receipt.invoiceNo}`, '');
    }
    if (receipt.showDateTime) {
      printer.leftRight(`Date: ${new Date().toLocaleDateString()}`, new Date().toLocaleTimeString());
    }
    if (receipt.showCashier && receipt.cashier) {
      printer.leftRight(`Cashier: ${receipt.cashier}`, '');
    }
    if (receipt.customer) {
      printer.leftRight(`Customer: ${receipt.customer}`, '');
    }

    printer.drawLine();

    // Items
    printer.alignLeft();
    printer.tableCustom([
      { text: "Item", align: "LEFT", width: 0.5 },
      { text: "Qty", align: "CENTER", width: 0.15 },
      { text: "Price", align: "RIGHT", width: 0.35 }
    ]);
    printer.drawLine();

    receipt.items.forEach(item => {
      printer.tableCustom([
        { text: item.name.substring(0, 20), align: "LEFT", width: 0.5 },
        { text: item.qty.toString(), align: "CENTER", width: 0.15 },
        { text: item.total.toFixed(2), align: "RIGHT", width: 0.35 }
      ]);
    });

    printer.drawLine();

    // Totals
    printer.alignRight();
    if (receipt.showDiscount && receipt.discount > 0) {
      printer.println(`Subtotal: ${receipt.subtotal?.toFixed(2) || '0.00'}`);
      printer.println(`Discount: -${receipt.discount.toFixed(2)}`);
    }
    if (receipt.showTax && receipt.tax > 0) {
      printer.println(`Tax: ${receipt.tax.toFixed(2)}`);
    }
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(`TOTAL: ${receipt.grandTotal.toFixed(2)}`);
    printer.bold(false);
    printer.setTextNormal();

    if (receipt.paid !== undefined) {
      printer.println(`Paid: ${receipt.paid.toFixed(2)}`);
      const change = receipt.paid - receipt.grandTotal;
      if (change > 0) {
        printer.println(`Change: ${change.toFixed(2)}`);
      }
    }

    printer.drawLine();

    // Footer
    printer.alignCenter();
    if (receipt.customerNote) {
      printer.newLine();
      printer.println(receipt.customerNote);
    }
    printer.newLine();
    printer.println('Thank you for your business!');
    printer.newLine();

    // Cut paper if enabled
    if (config?.auto_cut) {
      printer.cut();
    } else {
      printer.partialCut();
    }

    await printer.execute();
    console.log('[Electron] Receipt printed successfully');

    return { success: true, message: 'Receipt printed' };
  } catch (error) {
    console.error('[Electron] Print error:', error);
    return { success: false, error: error.message };
  }
});

