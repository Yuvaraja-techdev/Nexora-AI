import api from '../../utils/axios'
import { signOut } from 'firebase/auth'
import { auth } from '../../utils/firebase'

async function logOut() {
    try {
        const { data } = await api.get("/api/auth/logout")
        console.log(data)
    } catch (error) {
        console.log("Backend logout error:", error)
    } finally {
        try {
            await signOut(auth)
        } catch (err) {
            console.log("Firebase signOut error:", err)
        }
    }
}

export default logOut
