import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import commonSi from '../translations/si/common'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      si: {
        translation: commonSi,
      },
      en: {
        translation: commonSi,
      },
    },
    lng: 'si',
    fallbackLng: 'si',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
