import React from "react";
import Layout from "../Layout";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { List, ListItem, ListItemText, Divider, Grid2 } from '@mui/material';
import { useUserStore } from "../utils/store";
import { UserType } from "../types/types";
import { convertToGermanDate } from "../utils/dateUtils";

const UserPage: React.FC = () => {
    const { t } = useTranslation();
    const fetchUserData = useUserStore(state => state.fetchUserData);
    // Directly accessing userData.userData based on your data structure
    const userDataContainer = useUserStore(state => state.userData);
    const usersData = userDataContainer ? userDataContainer.userData : null;

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const style = {
        py: 0,
        width: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
    };

    // Helper function to render user data
    const renderUserData = (user: UserType) => (
        <>
            <ListItem>
                <ListItemText primary={t('username')} secondary={user.username ?? t('notAvailable')} />
            </ListItem>
            <ListItem>
                <ListItemText primary={t('lastLogin')} secondary={user.lastLoginTime ? convertToGermanDate(user.lastLoginTime) : t('notAvailable')} />
            </ListItem>
            <Divider component="li" />
        </>
    );

    return (
        <Layout title={t('userInfo')}>
            <Grid2 paddingTop={1} size={12}>
                <List sx={style}>
                    {Array.isArray(usersData) ? (
                        usersData.map(user => (
                            <React.Fragment key={user._id}>
                                {renderUserData(user)}
                            </React.Fragment>
                        ))
                    ) : usersData ? (
                        // Handling the single user object case
                        renderUserData(usersData)
                    ) : (
                        <ListItem>
                            <ListItemText primary={t('noUserDataAvailable')} />
                        </ListItem>
                    )}
                </List>
            </Grid2>
        </Layout>
    );
};

export default UserPage;
