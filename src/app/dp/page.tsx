"use client"
import React, { useEffect } from 'react'
import initGame from './initGame'

const Page = () => {
    useEffect(() => {
        initGame();
    }, []); // Only run once when the component is mounted
   
  return (
    <div id='canvas'> </div>
  )
}

export default Page; // Export as Page, not page
