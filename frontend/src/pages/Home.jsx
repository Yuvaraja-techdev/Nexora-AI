import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import { FcGoogle } from "react-icons/fc";
import { Loader2, AlertCircle } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import { setUserdata } from '../redux/userSlice';
import SideBar from '../components/SideBar';
import ChatArea from '../components/ChatArea';
import Artifact from '../components/Artifact';

function Home() {
    const { userData, isAuthChecking, authError } = useSelector(state => state.user)
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [loginError, setLoginError] = useState(null)
    const dispatch = useDispatch()

    const handleLogin = async (token) => {
        try {
            const { data } = await api.post("/api/auth/login", { token })
            dispatch(setUserdata(data))
            setLoginError(null)
        } catch (error) {
            console.error("Backend login error:", error)
            const errorMsg = error.response?.data?.message || error.message || "Failed to log in. Please check server connection."
            setLoginError(errorMsg)
        }
    }

    const googleLogin = async () => {
        setIsLoggingIn(true)
        setLoginError(null)
        try {
            const data = await signInWithPopup(auth, googleProvider)
            const token = await data.user.getIdToken()
            await handleLogin(token)
        } catch (err) {
            console.error("Google login error:", err)
            if (err.code !== 'auth/popup-closed-by-user') {
                setLoginError(err.message || "Google sign in failed")
            }
        } finally {
            setIsLoggingIn(false)
        }
    }

    const displayError = loginError || authError

    return (
        <div className='h-screen flex bg-[#0d0f14] text-white overflow-hidden'>
            <SideBar />
            <ChatArea />
            <Artifact />

            {/* Auth Checking Initial Loader */}
            {isAuthChecking && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#0d0f14]/80 backdrop-blur-sm'>
                    <div className='flex flex-col items-center gap-3'>
                        <Loader2 className='w-8 h-8 text-blue-500 animate-spin' />
                        <span className='text-sm text-slate-400'>Restoring session...</span>
                    </div>
                </div>
            )}

            {/* Login Modal (Shown only when not logged in and not in the middle of initial auth check) */}
            {!userData && !isAuthChecking && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur'>
                    <div className='w-[360px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 shadow-2xl'>
                        <div className='flex flex-col gap-1'>
                            <h2 className='text-[17px] font-semibold text-slate-100 tracking-tight'>Welcome to Nexora AI</h2>
                            <p className='text-[13px] text-slate-500'>Please login to continue using the app.</p>
                        </div>

                        {displayError && (
                            <div className='flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed'>
                                <AlertCircle size={16} className='shrink-0 mt-0.5 text-red-400' />
                                <span>{displayError}</span>
                            </div>
                        )}

                        <button
                            disabled={isLoggingIn}
                            className='w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black/90 bg-white hover:bg-gray-200 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
                            onClick={googleLogin}
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 size={16} className='animate-spin text-black' />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <FcGoogle size={18} />
                                    <span>Continue With Google</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home
