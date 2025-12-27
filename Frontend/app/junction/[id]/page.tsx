'use client'
import { useParams } from 'next/navigation'
import React from 'react'

const Junction = () => {
  const params = useParams();
  return (
    <div>Junction {params.id}</div>
  
  )
}

export default Junction