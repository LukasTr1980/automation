import { Db } from "mongodb";
import { connectToMongo } from "../clients/mongoClient.js";
import logger from "../logger.js";

interface User {
    username: string;
    [key: string]: unknown;
}

async function updateLastLogin(username: string): Promise<void> {
    try {
        const db: Db = await connectToMongo();
        const userCollection = db.collection('users');

        const lastLoginTime = Date.now();
        const updateResult = await userCollection.updateOne(
            { username: { $eq: username }},
            { $set: { lastLoginTime: lastLoginTime } },
            { upsert: true }
        );

        logger.info(`UpdateLastLogin - User: ${username}, Result: ${JSON.stringify(updateResult)}`);
    } catch (error) {
        logger.error(`UpdateLastLogin Error - User: ${username}, Error: ${error}`);
    }
}

async function getUserData(username: string): Promise<User | User[] | null> {
    try {
        const db: Db = await connectToMongo();
        const userCollection = db.collection<User>('users');

        const userInfo = await userCollection.findOne({ username: { $eq: username }});

        if (userInfo) {
            if (userInfo.username === 'admin') {
                logger.info(`getUserData - ${username} retrieving all user data`);
                const allUsers = await userCollection.find({}).toArray();
                return allUsers;
            } else {
                logger.info(`getUserData - Retrieved data for user: ${username}`);
                return userInfo;
            }
        } else {
            logger.info(`getUserData - No user found with username: ${username}`);
            return null;
        }
    } catch (error) {
        logger.error(`getUserData Error - User: ${username}, Error: ${error}`);
        return null;
    }
}

export { updateLastLogin, getUserData }