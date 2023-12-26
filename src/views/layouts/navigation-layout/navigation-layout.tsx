'use client'
import React, { useState } from 'react'
import NavBar from './nav-bar'
const NavigationLayout
    = ({
        children,
    }: {
        children: React.ReactNode
    }) => {
        const [user, setUser] = useState(null)
        return (
            <div>
                <NavBar setUser={setUser}/>
                {user
                    ? children
                    : <div>Require sign in with a valid user...</div>
                }
            </div>
        )
    }

export default NavigationLayout

