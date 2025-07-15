import React from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import Routers from '../routers/Routers'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'

function LayoutContent() {
  const location = useLocation();
  const hideHeaderFooter = location.pathname === '/' || location.pathname === '/register';
  return (
    <div className="flex flex-col min-h-screen">
      {!hideHeaderFooter && <Header />}
      <main className="flex-1">
        <Routers />
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function Layout() {
  return (
    <Router>
      <LayoutContent />
    </Router>
  )
}

export default Layout
 