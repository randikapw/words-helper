'use client'
import React from 'react'
import NavBar from './nav-bar'
const NavigationLayout
    = ({
        children,
    }: {
        children: React.ReactNode
    }) => {
        return (
            <div>
                <NavBar/>
                {children}
            </div>
        )
    }

export default NavigationLayout

