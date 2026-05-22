import { useLanguage } from "@/contexts/LanguageContext";
import { t as translate } from "@/lib/i18n";

export function useTranslation() {
  const { language } = useLanguage();

  return {
    t: (key: string) => translate(key, language),
    language,
  };
}
