// NavMenu.jsx
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, AppBar, Toolbar, Drawer, List, ListItemButton, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const NavMenu = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <List>
      {['Villa Anna', 'Tisens Julia', 'Tisens Simone', 'Settings'].map((text, index) => (
        <ListItemButton key={text} component={RouterLink} to={index === 0 ? '/' : `/${text.toLowerCase()}`}>
          {text}
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {isSmallScreen ? (
            <>
              <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle}>
                <MenuIcon />
              </IconButton>
              <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerToggle}>
                {drawer}
              </Drawer>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/home">Home</Button>
              <Button color="inherit" component={RouterLink} to="/bewaesserung">Bewässerung</Button>
              <Button color="inherit" component={RouterLink} to="/markise">Markise</Button>
              <Button color="inherit" component={RouterLink} to="/settings">Settings</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default NavMenu;
