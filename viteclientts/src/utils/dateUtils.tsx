import moment from "moment";
import 'moment/dist/locale/de'
moment.locale('de')
import { ConvertToGermanDateFunction } from "../types/types";

const convertToGermanDate: ConvertToGermanDateFunction = (unixTimeStamp) => {
    if (unixTimeStamp) {
        return moment(unixTimeStamp).locale('de').format('dddd, DD MMMM YYYY, HH:mm');
    }
    return null;
};

export { convertToGermanDate };