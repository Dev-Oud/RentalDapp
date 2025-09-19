import { createSlice } from '@reduxjs/toolkit'
import { globalStates as GlobalStates } from './globalStates'
import { globalActions as GlobalActions } from './globalActions'

export const globalSlices = createSlice({
  name: 'global',
  initialState: GlobalStates,
  reducers: GlobalActions,
})

export const globalActions = globalSlices.actions
export default globalSlices.reducer