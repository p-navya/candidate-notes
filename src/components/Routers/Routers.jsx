import React from 'react'
import {  Routes, Route, Navigate } from 'react-router-dom'
import Login from '../Pages/Login'
import Register from '../Pages/Register';
import Dashboard from '../../pages/Dashboard';
import CandidateNotes from '../../pages/CandidateNotes';
import { auth } from '@/firebase';
 
 
function PrivateRoute({ children }) {
  const user = auth.currentUser;
  return user ? children : <Navigate to="/" replace />;
}

function Routers() {
  return (
    <Routes>
       
            <Route path='/login' element={<Login/>}/>
            <Route path='/' element={<Login/>}/>
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/candidate/:candidateId" element={
              <PrivateRoute>
                <CandidateNotes />
              </PrivateRoute>
            } />
          
       
    </Routes>
  )
}
 
export default Routers
 