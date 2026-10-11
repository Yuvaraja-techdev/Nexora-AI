import { createSlice } from "@reduxjs/toolkit";

const userSlice=createSlice({
    name:"user",
    initialState:{
      userData:null,
      isAuthChecking: true,
      authError: null
    },
    reducers:{
        setUserdata:(state,action)=>{
            state.userData=action.payload
            state.isAuthChecking = false
            state.authError = null
        },
        setAuthChecking:(state,action)=>{
            state.isAuthChecking = action.payload
        },
        setAuthError:(state,action)=>{
            state.authError = action.payload
            state.isAuthChecking = false
        }
    }
   
})

export const {setUserdata, setAuthChecking, setAuthError}=userSlice.actions 
export default userSlice.reducer

