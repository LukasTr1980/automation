import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export const useStableTranslation = () => {
    const { t } = useTranslation();

    const strableTranslate = useCallback(
        (key: string) => t(key),
        [t]
    );

    return strableTranslate;
}