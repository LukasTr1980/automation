import { v4 as uuidv4 } from 'uuid';

const generateUniqueId = (): string => {
    return uuidv4();
};

export default generateUniqueId;
