import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import QueryRunner from './pages/QueryRunner';
import MigrationSetup from './pages/MigrationSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Jobs": Jobs,
    "QueryRunner": QueryRunner,
    "MigrationSetup": MigrationSetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};