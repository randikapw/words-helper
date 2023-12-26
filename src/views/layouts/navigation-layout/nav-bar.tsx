import userService from '@/views/services/userService';
import React, { useEffect, useRef, useState } from 'react'

const NavBar = ({ setUser }) => {
    const [textboxValue, setTextboxValue] = useState('Login');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTextboxValue(event.target.value);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const loadUser = async (user: string) => {
        try {
            setUser(null)
            setLoading(true)
            await userService.loadUser(user)
            localStorage.setItem("current_user", user);
            setUser(user)
            setTextboxValue(user)
            inputRef.current?.blur();

        } catch (error) {
            console.error(error)
            alert(error.message)
            setTimeout(() => {
                inputRef.current?.focus();

            }, 100);
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const currentUser = localStorage.getItem("current_user");
        if (currentUser) {
            loadUser(currentUser)
        }
    }, [])

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            loadUser(textboxValue)
            // setTextboxValue(''); // Clear the textbox after showing the alert
        }
    };
    function setPage(arg0: string): void {
        throw new Error('Function not implemented.')
    }

    return (
        <div className='flex bg-slate-100 justify-between p-2' >
            <div className='font-bold'>Words helper</div>
            <div className='flex-none' >
                {loading && <div>Loading...</div>}
                <input
                    ref={inputRef}
                    type="text"
                    value={textboxValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyPress} onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{
                        backgroundColor: isFocused ? 'white' : 'transparent',
                        textAlign: isFocused ? 'left' : 'right', // Dynamic text alignment
                        display: loading ? 'none' : 'inherit'
                    }}
                />
            </div>
        </div>
    )
}

export default NavBar
