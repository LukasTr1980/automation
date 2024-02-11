import Layout from "../Layout";
import { useTranslation } from "react-i18next";
import { convertToGermanDate } from "../utils/dateUtils";
import { useUserStore } from "../utils/store";
import { useEffect } from "react";
import { List, ListItem, ListItemText, Divider, Grid } from '@mui/material'

const UserPage: React.FC = () => {
    const { t } = useTranslation();
    const fetchUserData = useUserStore(state => state.fetchUserData);
    const userData = useUserStore(state => state.userData);
    const userLogin = useUserStore((state) => state.userLogin);

    useEffect(() => {
        if (!userData) {
            fetchUserData();
        }
    }, [fetchUserData, userData]);

    const lastLogin = userData ? convertToGermanDate(userData.lastLogin) : '';

    const style = {
        py: 0,
        width: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
    };

    return (
        <Layout title={t('userInfo')}>
            <Grid item paddingTop={1} xs={12}>
                <List sx={style}>
                    <ListItem>
                        <ListItemText primary={t('user')} secondary={userLogin ?? t('notAvailable')} />
                    </ListItem>
                    <Divider component="li" />
                    {userData && (
                        <>
                            <ListItem>
                                <ListItemText primary={t('lastLogin')} secondary={lastLogin} />
                            </ListItem>
                            <Divider component="li" />
                        </>
                    )}
                </List>
            </Grid>
        </Layout>
    );

};

export default UserPage;