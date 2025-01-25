"use client"
import React, { useEffect } from 'react'
import kaplay from 'kaplay'
import initGame from './initGame'





const page = () => {
    useEffect(()=>{
        initGame();
    })
   
  return (
    <div id='canvas'> </div>
  )
}

export default page