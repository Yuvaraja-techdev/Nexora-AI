import React, { useEffect } from 'react'
import Home from './pages/Home'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserdata, setAuthChecking, setAuthError } from './redux/userSlice'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../utils/firebase'
import api from '../utils/axios'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    let isMounted = true

    const syncAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (user && isMounted) {
          dispatch(setUserdata(user))
          return
        }
      } catch (err) {
        console.log("Session lookup failed:", err)
      }

      // If no active backend session, listen for Firebase Auth state
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return

        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken()
            const { data } = await api.post("/api/auth/login", { token })
            if (isMounted) {
              dispatch(setUserdata(data))
            }
          } catch (error) {
            console.error("Auto login with Firebase token failed:", error)
            if (isMounted) {
              dispatch(setAuthError(error.response?.data?.message || "Failed to authenticate session with server"))
            }
          }
        } else {
          if (isMounted) {
            dispatch(setUserdata(null))
          }
        }
      })

      return unsubscribe
    }

    const unsubPromise = syncAuth()

    return () => {
      isMounted = false
      unsubPromise.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      })
    }
  }, [dispatch])

  return (
    <>
      <Home />
    </>
  )
}

export default App
