import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import KeyboardShortcutManager from '../components/KeyboardShortcutManager';

const DashboardLayout = () => {
  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      <KeyboardShortcutManager />
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
