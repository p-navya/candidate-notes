import React from 'react';

function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t py-4 px-6 text-center text-gray-500 text-sm mt-8">
      &copy; {new Date().getFullYear()} Collaborative Candidate Notes. Made by <span className="text-blue-600">Navya</span> 
    </footer>
  );
}

export default Footer;