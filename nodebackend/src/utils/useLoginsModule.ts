import { Db } from "mongodb";
import { connectToMongo } from "../clients/mongoClient";
import logger from "../logger";

async function updateLastLogin(username: string): Promise<void> {
    try {
        const db: Db = await connectToMongo();
        const userLoginsCollection = db.collection('userLogins');

        const lastLoginTime = new Date();
        const updateResult = await userLoginsCollection.updateOne(
            { username: username },
            { $set: { lastLoginTime: lastLoginTime } },
            { upsert: true }
        );

        logger.info(`UpdateLastLogin - User: ${username}, Result: ${JSON.stringify(updateResult)}`);
    } catch (error) {
        logger.error(`UpdateLastLogin Error - User: ${username}, Error: ${error}`);
    }
}

async function getLastLogin(username: string): Promise<Date | null> {
    try {
        const db: Db = await connectToMongo();
        const userLoginsCollection = db.collection('userLogins');

        const userLoginInfo = await userLoginsCollection.findOne({ username: username });
        
        if (userLoginInfo && userLoginInfo.lastLoginTime) {
            logger.info(`getLastLogin - Retrieved last login for user: ${username}`);
            return userLoginInfo.lastLoginTime;
        } else {
            logger.info(`getLastLogin - No last login found for user: ${username}`);
            return null;
        }
    } catch (error) {
        logger.error(`getLastLogin Error - User: ${username}, Error: ${error}`);
        return null;
    }
}

export { updateLastLogin, getLastLogin }