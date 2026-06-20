import { useEffect, useRef } from 'react'
import { useSnackbar } from 'notistack'

import { replaceData, setCurrentUser, useAppDispatch, useAppSelector } from '../store'
import type { AppDataState } from '../store'
import { fetchAppDataFromSupabase } from '../services/supabaseData'
import { isSupabaseConfigured } from '../services/supabase'

export const useSupabaseSync = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const users = useAppSelector((state) => state.data.users)
  const bootstrappedRef = useRef(false)
  const bootstrapPromiseRef = useRef<Promise<AppDataState> | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || bootstrappedRef.current) {
      return
    }

    let mounted = true

    const bootstrap = async () => {
      try {
        if (!bootstrapPromiseRef.current) {
          bootstrapPromiseRef.current = fetchAppDataFromSupabase()
        }
        const remoteData = await bootstrapPromiseRef.current

        if (!mounted) {
          return
        }

        dispatch(replaceData(remoteData))
        bootstrappedRef.current = true
      } catch (error) {
        if (mounted) {
          enqueueSnackbar('Supabase දත්ත සම්බන්ධතාවය අසාර්ථක විය.', {
            variant: 'warning',
          })
        }
        bootstrapPromiseRef.current = null
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [dispatch, enqueueSnackbar])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const matchedUser =
      users.find((user) => user.id === currentUser.id) ??
      (currentUser.memberId ? users.find((user) => user.memberId === currentUser.memberId) : null) ??
      users.find((user) => user.email === currentUser.email) ??
      null
    if (matchedUser !== currentUser) {
      dispatch(setCurrentUser(matchedUser))
    }
  }, [currentUser, dispatch, users])
}
