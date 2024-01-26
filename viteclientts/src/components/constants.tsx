import { useTranslation } from "react-i18next";
import { DaysOfWeekNumbers, MonthsNumbers } from "../types/types";

export const useDaysOfWeek = () => {
  const { t } = useTranslation();
  return [
    t('sunday'), t('monday'), t('tuesday'), t('wednesday'), 
    t('thursday'), t('friday'), t('saturday')
  ];
};

export const useDaysOfWeekNumbers = () => {
  const daysOfWeek = useDaysOfWeek();
  return daysOfWeek.reduce<DaysOfWeekNumbers>((acc, day, index) => {
    acc[day] = index;
    return acc;
  }, {});
};

export const useMonths = () => {
  const { t } = useTranslation();
  return [
    t('january'), t('february'), t('march'), t('april'), 
    t('may'), t('june'), t('july'), t('august'), 
    t('september'), t('october'), t('november'), t('december')
  ];
};

export const useMonthsNumbers = () => {
  const months = useMonths();
  return months.reduce<MonthsNumbers>((acc, month, index) => {
    acc[month] = index;
    return acc;
  }, {});
};

export const monthsNumbers: { [key: string]: number } = {
  'Januar': 0,
  'Februar': 1,
  'März': 2,
  'April': 3,
  'Mai': 4,
  'Juni': 5,
  'Juli': 6,
  'August': 7,
  'September': 8,
  'Oktober': 9,
  'November': 10,
  'Dezember': 11
};
export const switchDescriptions: string[] = ['Stefan Nord', 'Stefan Ost', 'Lukas Süd', 'Lukas West', 'Alle'];
export const bewaesserungsTopics: string[] = [
  'bewaesserung/switch/stefanNord',
  'bewaesserung/switch/stefanOst',
  'bewaesserung/switch/lukasSued',
  'bewaesserung/switch/lukasWest',
  'bewaesserung/switch/alle',
];
export const zoneOrder: string[] = ["Stefan Nord", "Stefan Ost", "Lukas Süd", "Lukas West"];

export const bewaesserungsTopicsSet: string[] = [
  'bewaesserung/switch/stefanNord/set',
  'bewaesserung/switch/stefanOst/set',
  'bewaesserung/switch/lukasSued/set',
  'bewaesserung/switch/lukasWest/set',
  'bewaesserung/switch/alle/set',
];
